import {Octane} from '@microfocus/alm-octane-js-rest-sdk';
import fs from 'fs';
import PropertiesReader from 'properties-reader'
import shell from "shelljs";
import Query from "@microfocus/alm-octane-js-rest-sdk/dist/lib/query.js";

const properties = PropertiesReader("./octane-details.properties");

const octane = new Octane({
    server: properties.get("octane-url"),
    sharedSpace: properties.get("sharedspace"),
    workspace: properties.get("workspace"),
    user: properties.get("user"),
    password: properties.get("password")
})

async function getTestByNameAndClassName(testDetailsAsString) {
    try {
        // const query = Query.field('class_name')
        // const test2 = await octane.get(Octane.entityTypes.tests).query(query.build()).execute();

        const testDetailsAsArray = testDetailsAsString.split('#')
        const className = testDetailsAsArray[0]
        const testName = testDetailsAsArray[1]
        const test = await octane.executeCustomRequest(`/api/shared_spaces/1001/workspaces/34003/tests?query="class_name EQ ^${className}^;name EQ ^${testName}^"&fields=name,description,class_name`, Octane.operationTypes.get)
        return test;
    } catch (e) {
        console.log('caught error', e)
    }
}

async function createCommand(testDetails) {
    const test = await getTestByNameAndClassName(testDetails);
    const urlRepo = 'https://github.com/OnceaAndreea/SilkCentralDemo.git'; // will be taken from test
    const folderName = urlRepo.substring(urlRepo.lastIndexOf("/") + 1, urlRepo.indexOf(".git"))
    try {
        if (!fs.existsSync("./" + folderName)) {
            shell.exec('git clone ' + urlRepo)
        }
    } catch (e) {
        console.log("An error occurred.")
    }

    const projectPath = '/target'; //will be taken from test
    const classpath = './' + folderName + projectPath + '/*';
    const command = 'java -cp "' + classpath + '" JUnitCmdLineWrapper ' + await test.data[0].class_name + ' C:\\Users\\AOncea\\Desktop\\output.xml ' + await test.data[0].name;
    return command;
}

function writeToFile(fileName, command) {
    fs.writeFile(fileName, command, err => {
        if (err) {
            console.log('Error writing file', err)
        }
    })
}

createCommand("CalculatorTest#testSub").then((command) => {
    if (process.platform === "win32") {
        writeToFile('./command-to-execute.bat', command)
    } else {
        writeToFile('./command-to-execute.sh', command)
    }
})










