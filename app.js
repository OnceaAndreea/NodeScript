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
    const command = 'java -cp "' + classpath + '" JUnitCmdLineWrapper ' + test.data[0].class_name + ' ' + test.data[0].name;
    return command;
}

function writeToFile(fileName, command) {
    fs.appendFile(fileName, command, err => {
        if (err) {
            console.log('Error writing file', err)
        }
    })
}

function getExecutableFile(testsToRun) {
    const classesAndTestsToRun = testsToRun.split(',');
    const classAndTestsMap = new Map();
    classesAndTestsToRun.forEach(function (value) {
        const classAndTestsToRun = value.split('#')
        classAndTestsMap.set(classAndTestsToRun[0], classAndTestsToRun[1].split('+'))

    });
    if (fs.existsSync('./command_to_execute.bat')) {
        fs.unlinkSync('./command_to_execute.bat')
    }
    classAndTestsMap.forEach((value, key) => {
        value.forEach(function (val) {
            getCommand(key, val).then((command) => {
                if (process.platform === "win32") {
                    writeToFile('./command_to_execute.bat', command + "\n")
                } else {
                    writeToFile('./command-to-execute.sh', command + "\n")
                }
            })
        });
    })

}

getExecutableFile(process.env.testsToRunConverted)










