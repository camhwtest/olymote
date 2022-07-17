const Gpio = require('onoff').Gpio;



const delay = (millis) => {
    return new Promise(res => {
        setTimeout(res, millis)
    })
}


const main = async () => {

    const LEDS = [
        new Gpio(16, 'out'),
        new Gpio(20, 'out'),
        new Gpio(26, 'out'),
        new Gpio(21, 'out'),
        new Gpio(5, 'out'),
        new Gpio(6, 'out'),
        new Gpio(13, 'out'),
        new Gpio(19, 'out')
    ]

    const shutter = new Gpio(25, 'out');

    // Initialize 
    for(i = 0; i<LEDS.length; i++) {
        LEDS[i].writeSync(0);
    }
    shutter.writeSync(1);

    await delay(1000)
    console.log('writing shutter_button_down')
    shutter.writeSync(0);

    const delayMs = [
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10
    ]

    // Count up
    for(i = 0; i<LEDS.length; i++) {
        await delay(delayMs[i]);
        LEDS[i].writeSync(1);
    }

    await delay(10)
    console.log('writing shutter_button_up')
    shutter.writeSync(1);

};
main();

