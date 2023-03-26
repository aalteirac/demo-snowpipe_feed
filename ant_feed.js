const Ant = require('aai-ant-plus');
const stick = new Ant.GarminStick3;
const cadenceSensor = new Ant.CadenceSensor(stick);
const speedSensor = new Ant.SpeedSensor(stick);

var checkOldval=-1;
let lastPrintSpeedTime = Date.now();
let lastPrintCadenceTime = Date.now();

async function initANT(){
    speedSensor.setWheelCircumference(2.118);
    speedSensor.on('speedData', async data => {
        if(checkOldval!=data.CalculatedSpeed){
            const currentTime = Date.now();
            if (currentTime - lastPrintSpeedTime >= 400) { 
              console.log('SPEED  ', new Date(), data.CalculatedSpeed, data.CalculatedDistance);
              lastPrintSpeedTime = currentTime;
            }
            checkOldval=data.CalculatedSpeed;
        }
    });

    cadenceSensor.on('cadenceData', data => {
        if(true){
            const currentTime = Date.now();
            if (currentTime - lastPrintCadenceTime >= 400) { 
                console.log('CADENCE',new Date(),data.CalculatedCadence);
                lastPrintCadenceTime = currentTime;
            }
        }   
    });

    stick.on('startup', function () {
        console.log('startup');
        speedSensor.attach(0, 0)
        console.log('SPEED SENSOR ATTACHED')
        setTimeout(()=>{
            cadenceSensor.attach(1, 0);
            console.log('CADENCE SENSOR ATTACHED')
        },2000)
    });

    if (!stick.open()) {
        console.log('Stick not found!');
    }
}

function randomTS(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
    return (Math.random() * (max - min + 1) + min).toFixed(2);
}

async function simulateSensor(){
}
initANT()
module.exports = { initANT }

