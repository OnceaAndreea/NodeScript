import fs from 'fs';
import PropertiesReader from 'properties-reader'
import shell from "shelljs";
import {Octane, Query} from "@microfocus/alm-octane-js-rest-sdk";

const properties = PropertiesReader("./octane-details.properties");

const octane = new Octane({
    server: properties.get("octane-url"),
    sharedSpace: properties.get("sharedspace"),
    workspace: properties.get("workspace"),
    user: properties.get("user"),
    password: properties.get("password")
})

async function getOctaneTest(testPath, testMethod) {
    try {
        let query;
        if (testPath.lastIndexOf('.') > -1) {
            const testPackage = testPath.substring(0, testPath.lastIndexOf('.'))
            const testClass = testPath.substring(testPath.lastIndexOf('.') + 1, testPath.length)
            query = Query.field('class_name').equal(testClass).and(Query.field('name').equal(testMethod)).and(Query.field('package').equal(testPackage))
        } else {
            query = Query.field('class_name').equal(testPath).and(Query.field('name').equal(testMethod))
        }
        return await octane.get(Octane.entityTypes.tests).fields('name', 'class_name', 'description', 'package').query(query.build()).execute();
    } catch (e) {
        console.log('caught error', e)
    }
}

async function getCommand(testPath, testMethod) {
    const test = await getOctaneTest(testPath, testMethod);
    const urlRepo = 'https://github.com/OnceaAndreea/SilkCentralDemo.git'; // will be taken from test
    const branchName = 'master' //taken from repo
    const folderName = urlRepo.substring(urlRepo.lastIndexOf("/") + 1, urlRepo.indexOf(".git"))

    createClasspathFolder(urlRepo, branchName, folderName)
    const projectPath = '/target'; //will be taken from test
    const classpath = './' + folderName + projectPath + '/*';
    const command = 'java -cp "' + classpath + '" JUnitCmdLineWrapper ' + testPath + ' ' + testMethod
    return command;
}

function createClasspathFolder(urlRepo, branchName, folderName) {
    try {
        if (!fs.existsSync("./" + folderName)) {
            shell.exec('git clone ' + urlRepo)
            if (branchName != null) {
                shell.cd(folderName)
                shell.exec('git checkout ' + branchName)
                shell.exec('git pull ' + urlRepo + " " + branchName)
                shell.cd('../')
            }
        } else {
            if (branchName === null) {
                shell.cd(folderName)
                let branches = shell.exec('git branch').toString()
                if (branches.indexOf('master') > -1) {
                    shell.exec('git checkout master')
                    shell.exec('git pull master')
                } else {
                    shell.exec('git checkout main')
                    shell.exec('git pull main')
                }
                shell.cd('../')
            } else {
                shell.cd(folderName)
                shell.exec('git checkout ' + branchName)
                shell.exec('git pull ' + urlRepo + " " + branchName)
                shell.cd('../')
            }
        }
    } catch (e) {
        console.log("An error occurred.")
    }
}

function writeToFile(fileName, command) {
    fs.appendFile(fileName, command, err => {
        if (err) {
            console.log('Error writing file', err)
        }
    })
}

async function getExecutableFile(testsToRun) {
    const classesAndTestsToRun = testsToRun.split(',');
    const classAndTestsMap = new Map();
    classesAndTestsToRun.forEach(function (value) {
        const classAndTestsToRun = value.split('#')
        classAndTestsMap.set(classAndTestsToRun[0], classAndTestsToRun[1].split('+'))

    });
    if (fs.existsSync('./command_to_execute.bat')) {
        fs.unlinkSync('./command_to_execute.bat')
    }

    const commandsArray = new Array();

    for (const [testPath, testMethods] of classAndTestsMap) {
        for (const testMethod of testMethods) {
            await getCommand(testPath, testMethod).then((command) => {
                commandsArray.push(command)
            })
        }
    }
    let isFirstTestFromASuite = true;
    commandsArray.forEach(command => {
        const cmd = command.split('JUnitCmdLineWrapper')
        const cmdUpdated = cmd[0] + 'JUnitCmdLineWrapper' + ' ' + isFirstTestFromASuite + cmd[1];
        if (isFirstTestFromASuite === true) {
            isFirstTestFromASuite = false;
        }
        if (process.platform === "win32") {
            writeToFile('./command_to_execute.bat', cmdUpdated + "\n")
        } else {
            writeToFile('./command_to_execute.sh', cmdUpdated + "\n")
        }
    })
}

getExecutableFile(process.env.testsToRunConverted)
// getExecutableFile('domains.animals.AnimalTest#checkIfCatVaccinated+checkCatAge+checkCatName,domains.jobs.TeacherTest#checkAge')










