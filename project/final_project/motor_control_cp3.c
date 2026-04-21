/**
 * ============================================================================
 * PARMCO — Motor Control with 3 Modes
 * ============================================================================
 *
 * Modes:
 *   1. MANUAL
 *      - '+' / '-' change speed directly
 *
 *   2. MAINTAIN
 *      - '[' / ']' change target RPM
 *      - motor uses GPIO17 actual RPM feedback to hold target
 *
 *   3. MATCH
 *      - GPIO23 reads a reference pulse source (function generator or 2nd IR)
 *      - program converts that to RPM assuming 3 pulses/rev
 *      - motor matches that RPM using GPIO17 actual RPM feedback
 *
 * Hardware:
 *   GPIO18 -> L293D Enable (PWM)
 *   GPIO20 -> L293D In1
 *   GPIO21 -> L293D In2
 *   GPIO17 -> actual motor IR sensor
 *   GPIO23 -> reference RPM input (FG or 2nd IR)
 *
 * Compile:
 *   gcc -c gpio_asm.s -o gpio_asm.o
 *   gcc -o motor_control motor_control.c gpio_asm.o -lpigpio -lrt -lpthread
 *
 * Run:
 *   sudo ./motor_control
 * ============================================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <termios.h>
#include <sys/select.h>
#include <sys/mman.h>
#include <time.h>
#include <stdint.h>

#include <pigpio.h>

/* ============================================================================
 * CONSTANTS
 * ============================================================================ */
#define GPIO_MAP_SIZE        0x1000

#define PIN_ENABLE           18
#define PIN_IN1              20
#define PIN_IN2              21

#define PIN_IR_ACTUAL        17   /* actual motor RPM sensor */
#define PIN_IR_REF           23   /* function generator / second IR sensor */

#define PWM_MAX_DUTY         255
#define SPEED_STEP_PERCENT   10
#define LOOP_DELAY_US        50000

#define PULSES_PER_REV_ACTUAL  3
#define PULSES_PER_REV_REF     3

#define RPM_SAMPLE_MS        250
#define CONTROL_PERIOD_MS    250

/* 6000 RPM max per your request */
#define TARGET_RPM_MIN       0
#define TARGET_RPM_MAX       6000
#define TARGET_RPM_STEP      100

/* Noise filter */
#define MIN_PULSE_US         800

/* Control gain */
#define KP                   0.04f

/* ============================================================================
 * ASSEMBLY FUNCTIONS
 * ============================================================================ */
extern void gpio_init(volatile void *base_ptr);
extern void gpio_set_output(unsigned int pin);
extern void gpio_write(unsigned int pin, unsigned int value);

/* ============================================================================
 * TYPES
 * ============================================================================ */
typedef enum {
    MODE_MANUAL = 0,
    MODE_MAINTAIN = 1,
    MODE_MATCH = 2
} control_mode_t;

/* ============================================================================
 * GLOBAL STATE
 * ============================================================================ */
static control_mode_t mode = MODE_MANUAL;

static int motor_direction = 1;      /* 1 = forward, 0 = reverse */
static int motor_running = 0;
static int motor_speed_percent = 0;  /* used in manual mode */
static int pwm_duty = 0;             /* raw 0-255 */
static int target_rpm = 1200;

/* actual motor measurement on GPIO17 */
static volatile unsigned int actual_pulse_count = 0;
static volatile unsigned int actual_last_tick = 0;
static volatile float actual_freq_hz = 0.0f;
static volatile float actual_rpm = 0.0f;
static volatile unsigned int actual_pulses_snapshot = 0;

/* reference measurement on GPIO23 */
static volatile unsigned int ref_pulse_count = 0;
static volatile unsigned int ref_last_tick = 0;
static volatile float ref_freq_hz = 0.0f;
static volatile float ref_rpm = 0.0f;
static volatile unsigned int ref_pulses_snapshot = 0;

static struct termios orig_termios;
static int termios_saved = 0;
static volatile int quit_requested = 0;

/* ============================================================================
 * HELPERS
 * ============================================================================ */
static unsigned long long get_time_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ((unsigned long long)ts.tv_sec * 1000ULL) +
           ((unsigned long long)ts.tv_nsec / 1000000ULL);
}

static int clamp_int(int x, int min, int max)
{
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

static float compute_rpm(unsigned int pulses, unsigned long long elapsed_ms, int pulses_per_rev)
{
    float freq_hz;

    if (elapsed_ms == 0 || pulses_per_rev <= 0) return 0.0f;

    freq_hz = ((float)pulses * 1000.0f) / (float)elapsed_ms;
    return (freq_hz * 60.0f) / (float)pulses_per_rev;
}

/* ============================================================================
 * TERMINAL
 * ============================================================================ */
static void restore_terminal(void)
{
    if (termios_saved) {
        tcsetattr(STDIN_FILENO, TCSANOW, &orig_termios);
        termios_saved = 0;
        printf("\n[PARMCO] Terminal restored.\n");
    }
}

static void set_raw_mode(void)
{
    struct termios raw;

    if (tcgetattr(STDIN_FILENO, &orig_termios) < 0) {
        perror("tcgetattr");
        exit(EXIT_FAILURE);
    }

    termios_saved = 1;
    atexit(restore_terminal);

    raw = orig_termios;
    raw.c_lflag &= ~(ICANON | ECHO);
    raw.c_cc[VMIN] = 0;
    raw.c_cc[VTIME] = 0;

    if (tcsetattr(STDIN_FILENO, TCSANOW, &raw) < 0) {
        perror("tcsetattr");
        exit(EXIT_FAILURE);
    }
}

static int kbhit(void)
{
    fd_set read_fds;
    struct timeval timeout;

    FD_ZERO(&read_fds);
    FD_SET(STDIN_FILENO, &read_fds);

    timeout.tv_sec = 0;
    timeout.tv_usec = 0;

    return select(STDIN_FILENO + 1, &read_fds, NULL, NULL, &timeout) > 0;
}

static int read_key(void)
{
    char c;
    if (read(STDIN_FILENO, &c, 1) == 1) return (int)c;
    return -1;
}

/* ============================================================================
 * GPIO MAP
 * ============================================================================ */
static volatile void *map_gpio(void)
{
    int fd;
    volatile void *gpio_map;

    fd = open("/dev/gpiomem", O_RDWR | O_SYNC);
    if (fd < 0) {
        perror("open /dev/gpiomem");
        fprintf(stderr, "Run with sudo.\n");
        exit(EXIT_FAILURE);
    }

    gpio_map = mmap(NULL, GPIO_MAP_SIZE, PROT_READ | PROT_WRITE,
                    MAP_SHARED, fd, 0);
    close(fd);

    if (gpio_map == MAP_FAILED) {
        perror("mmap");
        exit(EXIT_FAILURE);
    }

    return gpio_map;
}

/* ============================================================================
 * MOTOR OUTPUT
 * ============================================================================ */
static void update_direction(void)
{
    if (motor_direction) {
        gpio_write(PIN_IN1, 1);
        gpio_write(PIN_IN2, 0);
    } else {
        gpio_write(PIN_IN1, 0);
        gpio_write(PIN_IN2, 1);
    }
}

static void set_pwm_raw(int duty)
{
    pwm_duty = clamp_int(duty, 0, PWM_MAX_DUTY);

    if (motor_running) {
        gpioPWM(PIN_ENABLE, pwm_duty);
    } else {
        gpioPWM(PIN_ENABLE, 0);
    }
}

static void update_pwm_manual(void)
{
    int duty = 0;

    if (motor_running && motor_speed_percent > 0) {
        duty = (motor_speed_percent * PWM_MAX_DUTY) / 100;
    }

    set_pwm_raw(duty);
}

/* ============================================================================
 * RPM CALLBACKS
 * ============================================================================ */
static void actual_ir_alert(int gpio, int level, uint32_t tick)
{
    (void)gpio;

    /* Count rising edges */
    if (level == 1) {
        if (actual_last_tick == 0 || gpioTickDiff(actual_last_tick, tick) > MIN_PULSE_US) {
            actual_pulse_count++;
            actual_last_tick = tick;
        }
    }
}

static void ref_ir_alert(int gpio, int level, uint32_t tick)
{
    (void)gpio;

    /* Count rising edges */
    if (level == 1) {
        if (ref_last_tick == 0 || gpioTickDiff(ref_last_tick, tick) > MIN_PULSE_US) {
            ref_pulse_count++;
            ref_last_tick = tick;
        }
    }
}

/* ============================================================================
 * RPM UPDATE
 * ============================================================================ */
static void update_rpm_measurements(void)
{
    static unsigned long long last_sample_ms = 0;
    unsigned long long now_ms;
    unsigned long long elapsed_ms;
    unsigned int actual_pulses;
    unsigned int ref_pulses;

    now_ms = get_time_ms();

    if (last_sample_ms == 0) {
        last_sample_ms = now_ms;
        return;
    }

    elapsed_ms = now_ms - last_sample_ms;
    if (elapsed_ms < RPM_SAMPLE_MS) return;

    actual_pulses = actual_pulse_count;
    ref_pulses = ref_pulse_count;

    actual_pulse_count = 0;
    ref_pulse_count = 0;

    actual_pulses_snapshot = actual_pulses;
    ref_pulses_snapshot = ref_pulses;

    actual_freq_hz = ((float)actual_pulses * 1000.0f) / (float)elapsed_ms;
    actual_rpm = compute_rpm(actual_pulses, elapsed_ms, PULSES_PER_REV_ACTUAL);

    ref_freq_hz = ((float)ref_pulses * 1000.0f) / (float)elapsed_ms;
    ref_rpm = compute_rpm(ref_pulses, elapsed_ms, PULSES_PER_REV_REF);

    if (!motor_running || pwm_duty == 0) {
        actual_freq_hz = 0.0f;
        actual_rpm = 0.0f;
    }

    last_sample_ms = now_ms;
}

/* ============================================================================
 * CONTROLLERS
 * ============================================================================ */
static void update_maintain_mode(void)
{
    float error;
    int adjust;
    int new_duty;

    if (!motor_running) {
        set_pwm_raw(0);
        return;
    }

    error = (float)target_rpm - actual_rpm;
    adjust = (int)(KP * error);

    /* deadband */
    if (error > -30.0f && error < 30.0f) {
        adjust = 0;
    }

    new_duty = pwm_duty + adjust;
    set_pwm_raw(new_duty);
}

static void update_match_mode(void)
{
    float error;
    int adjust;
    int new_duty;

    if (!motor_running) {
        set_pwm_raw(0);
        return;
    }

    error = ref_rpm - actual_rpm;
    adjust = (int)(KP * error);

    /* deadband */
    if (error > -30.0f && error < 30.0f) {
        adjust = 0;
    }

    new_duty = pwm_duty + adjust;
    set_pwm_raw(new_duty);
}

/* ============================================================================
 * STATUS DISPLAY
 * ============================================================================ */
static const char *mode_string(control_mode_t m)
{
    switch (m) {
        case MODE_MANUAL:   return "MANUAL";
        case MODE_MAINTAIN: return "MAINTAIN";
        case MODE_MATCH:    return "MATCH";
        default:            return "UNKNOWN";
    }
}

static void print_status(void)
{
    const char *dir_str = motor_direction ? "FORWARD" : "REVERSE";
    const char *run_str = motor_running ? "ON" : "OFF";

    printf("\r\033[K");
    printf("[%s] Mode:%s | Dir:%s | Manual:%3d%% | PWM:%3d%% | Target:%4d | Actual:%7.1f RPM | A_Pulses:%3u | Ref:%7.1f RPM | R_Pulses:%3u",
           run_str,
           mode_string(mode),
           dir_str,
           motor_speed_percent,
           (pwm_duty * 100) / PWM_MAX_DUTY,
           target_rpm,
           actual_rpm,
           actual_pulses_snapshot,
           ref_rpm,
           ref_pulses_snapshot);
    fflush(stdout);
}

/* ============================================================================
 * SIGNAL / CLEANUP
 * ============================================================================ */
static void signal_handler(int signum)
{
    (void)signum;
    quit_requested = 1;
}

static void cleanup(void)
{
    printf("\n\n[PARMCO] Shutting down...\n");

    gpioPWM(PIN_ENABLE, 0);
    gpio_write(PIN_IN1, 0);
    gpio_write(PIN_IN2, 0);

    gpioSetAlertFunc(PIN_IR_ACTUAL, NULL);
    gpioSetAlertFunc(PIN_IR_REF, NULL);

    gpioTerminate();
    printf("[PARMCO] Cleanup complete.\n");
}

/* ============================================================================
 * MAIN
 * ============================================================================ */
int main(void)
{
    volatile void *gpio_base;
    int key;
    unsigned long long last_status_ms = 0;
    unsigned long long last_control_ms = 0;

    printf("\n");
    printf("============================================================\n");
    printf("  PARMCO Motor Control — 3 Modes\n");
    printf("============================================================\n");
    printf("  GPIO18 -> L293D Enable (PWM)\n");
    printf("  GPIO20 -> L293D In1\n");
    printf("  GPIO21 -> L293D In2\n");
    printf("  GPIO17 -> actual motor IR sensor\n");
    printf("  GPIO23 -> function generator / second IR sensor\n");
    printf("\n");
    printf("  MODES:\n");
    printf("    m -> MANUAL   (+/- changes PWM)\n");
    printf("    t -> MAINTAIN ([/] target RPM control)\n");
    printf("    g -> MATCH    (match GPIO23 RPM)\n");
    printf("\n");
    printf("  KEYS:\n");
    printf("    w / s   forward / reverse\n");
    printf("    + / -   manual speed up / down\n");
    printf("    ] / [   target RPM up / down (MAINTAIN mode)\n");
    printf("    space   motor on / off\n");
    printf("    q       quit\n");
    printf("============================================================\n");

    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);

    if (gpioInitialise() < 0) {
        fprintf(stderr, "[PARMCO] Failed to initialise pigpio.\n");
        fprintf(stderr, "Make sure BLE is stopped and run with sudo.\n");
        return EXIT_FAILURE;
    }

    gpio_base = map_gpio();
    gpio_init(gpio_base);

    gpio_set_output(PIN_IN1);
    gpio_set_output(PIN_IN2);
    update_direction();

    gpioSetPWMfrequency(PIN_ENABLE, 20000);
    gpioPWM(PIN_ENABLE, 0);

    /* actual RPM input */
    gpioSetMode(PIN_IR_ACTUAL, PI_INPUT);
    gpioSetPullUpDown(PIN_IR_ACTUAL, PI_PUD_UP);
    gpioSetAlertFunc(PIN_IR_ACTUAL, actual_ir_alert);

    /* reference RPM input */
    gpioSetMode(PIN_IR_REF, PI_INPUT);
    gpioSetPullUpDown(PIN_IR_REF, PI_PUD_OFF);
    gpioSetAlertFunc(PIN_IR_REF, ref_ir_alert);

    set_raw_mode();

    printf("\n[PARMCO] Ready.\n\n");
    print_status();

    while (!quit_requested) {
        if (kbhit()) {
            key = read_key();

            switch (key) {
                case 'w':
                case 'W':
                    motor_direction = 1;
                    update_direction();
                    break;

                case 's':
                case 'S':
                    motor_direction = 0;
                    update_direction();
                    break;

                case '+':
                case '=':
                    if (mode == MODE_MANUAL) {
                        motor_speed_percent += SPEED_STEP_PERCENT;
                        motor_speed_percent = clamp_int(motor_speed_percent, 0, 100);
                        update_pwm_manual();
                    }
                    break;

                case '-':
                case '_':
                    if (mode == MODE_MANUAL) {
                        motor_speed_percent -= SPEED_STEP_PERCENT;
                        motor_speed_percent = clamp_int(motor_speed_percent, 0, 100);
                        update_pwm_manual();
                    }
                    break;

                case 'm':
                case 'M':
                    mode = MODE_MANUAL;
                    update_pwm_manual();
                    break;

                case 't':
                case 'T':
                    mode = MODE_MAINTAIN;
                    /* start from current manual duty */
                    pwm_duty = (motor_speed_percent * PWM_MAX_DUTY) / 100;
                    set_pwm_raw(pwm_duty);
                    break;

                case 'g':
                case 'G':
                    mode = MODE_MATCH;
                    /* start from current manual duty */
                    pwm_duty = (motor_speed_percent * PWM_MAX_DUTY) / 100;
                    set_pwm_raw(pwm_duty);
                    break;

                case ']':
                    if (mode == MODE_MAINTAIN) {
                        target_rpm += TARGET_RPM_STEP;
                        target_rpm = clamp_int(target_rpm, TARGET_RPM_MIN, TARGET_RPM_MAX);
                    }
                    break;

                case '[':
                    if (mode == MODE_MAINTAIN) {
                        target_rpm -= TARGET_RPM_STEP;
                        target_rpm = clamp_int(target_rpm, TARGET_RPM_MIN, TARGET_RPM_MAX);
                    }
                    break;

                case ' ':
                    motor_running = !motor_running;

                    if (mode == MODE_MANUAL) {
                        update_pwm_manual();
                    } else {
                        if (!motor_running) {
                            set_pwm_raw(0);
                        } else {
                            set_pwm_raw(pwm_duty);
                        }
                    }
                    break;

                case 'q':
                case 'Q':
                    quit_requested = 1;
                    break;

                default:
                    break;
            }

            print_status();
        }

        update_rpm_measurements();

        {
            unsigned long long now_ms = get_time_ms();

            if (now_ms - last_control_ms >= CONTROL_PERIOD_MS) {
                if (mode == MODE_MAINTAIN) {
                    update_maintain_mode();
                } else if (mode == MODE_MATCH) {
                    update_match_mode();
                }
                last_control_ms = now_ms;
            }

            if (now_ms - last_status_ms >= RPM_SAMPLE_MS) {
                print_status();
                last_status_ms = now_ms;
            }
        }

        usleep(LOOP_DELAY_US);
    }

    cleanup();
    return EXIT_SUCCESS;
}
