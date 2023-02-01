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

async function getTestByNameAndClassName(testClassName, testMethodName) {
    try {
        const query = Query.field('class_name').equal(testClassName).and(Query.field('name').equal(testMethodName))
        const test = await octane.get(Octane.entityTypes.tests).fields('name', 'class_name', 'description').query(query.build()).execute();
        return test;
    } catch (e) {
        console.log('caught error', e)
    }
}

async function getCommand(testClassName, testMethodName) {
    const test = await getTestByNameAndClassName(testClassName, testMethodName);
    const urlRepo = 'https://github.com/OnceaAndreea/SilkCentralDemo.git'; // will be taken from test
    const branchName = 'master' //taken from repo
    const folderName = urlRepo.substring(urlRepo.lastIndexOf("/") + 1, urlRepo.indexOf(".git"))

    createClasspathFolder(urlRepo, branchName, folderName)
    const projectPath = '/target'; //will be taken from test
    const classpath = './' + folderName + projectPath + '/*';
    const command = 'java -cp "' + classpath + '" JUnitCmdLineWrapper ' + 'CalculatorTest'
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

// async function getExecutableFile(testsToRun) {
//     const classesAndTestsToRun = testsToRun.split(',');
//     const classAndTestsMap = new Map();
//     classesAndTestsToRun.forEach(function (value) {
//         const classAndTestsToRun = value.split('#')
//         classAndTestsMap.set(classAndTestsToRun[0], classAndTestsToRun[1].split('+'))
//
//     });
//     if (fs.existsSync('./command_to_execute.bat')) {
//         fs.unlinkSync('./command_to_execute.bat')
//     }
//     classAndTestsMap.forEach((value, key) => {
//         value.forEach(function (val) {
//             getCommand(key, val).then((command) => {
//                 if (process.platform === "win32") {
//                     writeToFile('./command_to_execute.bat', command + "\n")
//                 } else {
//                     writeToFile('./command_to_execute.sh', command + "\n")
//                 }
//             })
//         });
//     })
//
// }

async function getExecutableFile(testsToRun) {

            if (fs.existsSync('./command_to_execute.bat')) {
                fs.unlinkSync('./command_to_execute.bat')
            }

            getCommand('CalculatorTest', 'testAdd').then((command) => {
                if (process.platform === "win32") {
                    writeToFile('./command_to_execute.bat', command + "\n")
                } else {
                    writeToFile('./command_to_execute.sh', command + "\n")
                }
            })

    }

getExecutableFile('CalculatorTest#testMultiply+testSub')










