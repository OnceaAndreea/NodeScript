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

getTestById("676003").then(function (result) {

    fs.writeFile('./test-details.json', JSON.stringify(result), err => {
        if (err) {
            console.log('Error writing file', err)
        }
    })

})






