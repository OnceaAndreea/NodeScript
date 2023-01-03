import {Octane} from '@microfocus/alm-octane-js-rest-sdk';
import fs from 'fs';
import PropertiesReader from 'properties-reader'


const properties = PropertiesReader("./octane-details.properties");

const octane = new Octane({
    server: properties.get("octane-url"),
    sharedSpace: properties.get("sharedspace"),
    workspace: properties.get("workspace"),
    user: properties.get("user"),
    password: properties.get("password")
})

async function getTestById(testId) {
    try {
        const test = await octane.get(Octane.entityTypes.tests).at(testId).fields('name', 'description', 'owner').execute();
        return test;
    } catch (e) {
        console.log('caught error', e)
    }
}

async function createCommand(testId) {
        const test = await getTestById(testId);
        return test.type + test.description;
    }

 function writeToFile(fileName, command) {
     fs.writeFile(fileName, command, err => {
         if (err) {
             console.log('Error writing file', err)
         }
     })
 }

createCommand(process.env.testsToRun).then((command) => {
    if (process.platform === "win32") {
        writeToFile('./command-to-execute.bat', command)
    } else {
        writeToFile('./command-to-execute.sh', command)
    }
})










