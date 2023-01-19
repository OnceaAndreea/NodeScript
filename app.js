import {Octane} from '@microfocus/alm-octane-js-rest-sdk';
import fs from 'fs';
import PropertiesReader from 'properties-reader'
import shell from "shelljs";
// import simpleGit from "simple-git";

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
        const test = await octane.get(Octane.entityTypes.tests).at(testId).fields('name', 'description', 'class_name').execute();
        return test;
    } catch (e) {
        console.log('caught error', e)
    }
}

async function createCommand(testId) {
    const test = await getTestById(testId);
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
    const command = 'java -cp "' + classpath + '" JUnitCmdLineWrapper ' + test.class_name + ' C:\\Users\\AOncea\\Desktop\\output.xml ' + test.name;
    return command;
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










