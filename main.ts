/*
 * Line follower for R4M National 2026 - Indonesia
 * Used PID Algorithm, reference: https://robotresearchlab.com/2019/02/16/pid-line-follower-tuning/
 * by rens
 *
 * Pins:
 * +-----------------+
 * | MTL MTR [ ] [ ] | Button
 * | BTN             | Motors
 * +-----------------+
 * | . . . . . . L R | Sensors  (L=16, R=0)
 * +-----------------+
 * Using the new (as of 2026) microbit case from gigo
 */

const Motor = {
    // 0-255
    MAX_SPEED: 80,
    // 0-255
    BASE_SPEED: 45,
    //[Control Pin, Speed Pin]
    LEFT: [AnalogPin.P2, AnalogPin.P1],
    RIGHT: [AnalogPin.P13, AnalogPin.P8],

    set: (motor: AnalogPin[], ctrl: number, speed: number) => {
        sensors.DDMmotor(motor[0], ctrl, motor[1], speed);
    }
}

const setMotor = (motor: AnalogPin[], forwardCtrl: number, speed: number) => {
    const reverseCtrl = forwardCtrl === 0 ? 1 : 0;
    if (speed >= 0) {
        Motor.set(motor, forwardCtrl, Math.min(speed, Motor.MAX_SPEED));
    } else {
        Motor.set(motor, reverseCtrl, Math.min(-speed, Motor.MAX_SPEED));
    }
}

const Sensor = {
    LEFT: DigitalPin.P16,
    RIGHT: DigitalPin.P0,

    isOnLine: (sensor: DigitalPin) => pins.digitalReadPin(sensor) == 1
}

const ForceSensor = {
    MAIN: DigitalPin.P20,

    isPressed: (forceSensor: DigitalPin = null) =>
        pins.digitalReadPin(forceSensor == null ? ForceSensor.MAIN : forceSensor) == 0
}

const showRouteIcon = (route: Route) => {
    switch (route) {
        case "R":
            basic.showLeds(`
                . . . . .
                . . # . .
                . # . # .
                . # . . .
                . # . . .
            `, 0)
            break
        case "G":
            basic.showLeds(`
                . . . . .
                . . # . .
                . # . # .
                . . # # .
                . # # # .
            `, 0)
            break
        case "B":
            basic.showLeds(`
                . . . . .
                . # . . .
                . # # . .
                . # . # .
                . # # . .
            `, 0)
            break
    }
}

const routes: ['R', 'G', 'B'] = ['R', 'G', 'B'];
type Route = typeof routes[number];

let wasOnBothLine = false;
let wasOnBothLineCounter = 0;
let timeSinceLastOnBothLine = 0;
let maxSpeedBumpCounter = 0;

const start = (route: Route) => {
    // Reset state variables every start
    wasOnBothLine = false;
    wasOnBothLineCounter = 0;
    timeSinceLastOnBothLine = 0;
    maxSpeedBumpCounter = 0;

    showRouteIcon(route);

    Motor.set(Motor.LEFT, 0, Motor.MAX_SPEED);
    Motor.set(Motor.RIGHT, 1, Motor.MAX_SPEED);

    basic.pause(1000);

    const Kp = Motor.BASE_SPEED * 3;
    const Ki = 0;
    const Kd = 0;
    let [P, I, D, lastError] = [0, 0, 0, 0];

    while (true) {
        const leftOnLine = Sensor.isOnLine(Sensor.LEFT);
        const rightOnLine = Sensor.isOnLine(Sensor.RIGHT);

        if (leftOnLine) led.plot(0, 0); else led.unplot(0, 0);
        if (rightOnLine) led.plot(4, 0); else led.unplot(4, 0);

        /* PID ALGORITHM */
        let error = 0;
        if (leftOnLine && !rightOnLine) { // drifting right
            error = 1;
            wasOnBothLine = false;
        } else if (!leftOnLine && rightOnLine) { // drifting left
            error = -1;
            wasOnBothLine = false;
        } else if (leftOnLine && rightOnLine) { // both line
            let shouldBreak = true;

            if (!wasOnBothLine) {
                wasOnBothLineCounter++;
                if (wasOnBothLineCounter === 1) {
                    timeSinceLastOnBothLine = input.runningTime();
                }
            }

            if (route === "G") {
                if (input.runningTime() - timeSinceLastOnBothLine < 1000) {
                    shouldBreak = false;

                    if (!wasOnBothLine && maxSpeedBumpCounter < 2) {
                        maxSpeedBumpCounter++;
                        setMotor(Motor.LEFT, 0, Motor.MAX_SPEED);
                        setMotor(Motor.RIGHT, 1, Motor.MAX_SPEED);
                        basic.pause(200);
                    }
                }
            }

            wasOnBothLine = true;
            if (shouldBreak) break;
        } else {
            wasOnBothLine = false;
        }

        P = error;
        I = I + error;
        D = error - lastError;
        lastError = error;

        const correction = (Kp * P) + (Ki * I) + (Kd * D);

        setMotor(Motor.LEFT, 0, Motor.BASE_SPEED - correction);
        setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED + correction);
    }

    basic.showIcon(IconNames.No, 0);

    switch (route) {
        case "R":
            setMotor(Motor.LEFT, 0, Motor.MAX_SPEED);
            setMotor(Motor.RIGHT, 0, Motor.MAX_SPEED);
            basic.pause(500);
            setMotor(Motor.LEFT, 0, Motor.BASE_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED);
            basic.pause(600);
            break
        case "G":
            setMotor(Motor.LEFT, 0, Motor.BASE_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED);
            basic.pause(200);
            setMotor(Motor.LEFT, 0, Motor.MAX_SPEED);
            setMotor(Motor.RIGHT, 0, Motor.MAX_SPEED);
            basic.pause(700);
            setMotor(Motor.LEFT, 0, Motor.BASE_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED);
            basic.pause(550);
            break
        case "B":
            setMotor(Motor.LEFT, 0, Motor.BASE_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED);
            basic.pause(1450);
            setMotor(Motor.LEFT, 1, Motor.MAX_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.MAX_SPEED);
            basic.pause(700);
            setMotor(Motor.LEFT, 0, Motor.BASE_SPEED);
            setMotor(Motor.RIGHT, 1, Motor.BASE_SPEED);
            basic.pause(600);
            break
    }

    Motor.set(Motor.LEFT, 0, 0);
    Motor.set(Motor.RIGHT, 1, 0);

    basic.showIcon(IconNames.Diamond, 0);
}

input.onButtonPressed(Button.A, () => {
    start("R");
})
input.onButtonPressed(Button.B, () => {
    start("G");
})
basic.forever(() => {
    if (Sensor.isOnLine(Sensor.LEFT)) led.plot(0, 0); else led.unplot(0, 0);
    if (Sensor.isOnLine(Sensor.RIGHT)) led.plot(4, 0); else led.unplot(4, 0);

    if (ForceSensor.isPressed(ForceSensor.MAIN)) {
        start("B");
    }
})

basic.showIcon(IconNames.Diamond, 0);
