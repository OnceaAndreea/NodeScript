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
        return await octane.get(Octane.entityTypes.tests).fields('name', 'owner', 'class_name', 'description', 'package', 'classpath_udf', 'branch_udf', 'configuration_type_udf', 'repourl_udf', 'projectpath_udf').query(query.build()).execute();
    } catch (e) {
        console.log('caught error', e)
    }
}

async function getListValueById(valueId) {
    const query = Query.field('id').equal(valueId)
    return await octane.get(Octane.entityTypes.listNodes).fields('name').query(query.build()).execute();
}

async function getCommand(testPath, testMethod) {
    const test = await getOctaneTest(testPath, testMethod);
    const configurationTypeValue = await getListValueById(test.data[0].configuration_type_udf.id)
    const configurationTypeName = configurationTypeValue.data[0].name
    const urlRepo = test.data[0].repourl_udf;
    const branchName = test.data[0].branch_udf
    const folderName = urlRepo.substring(urlRepo.lastIndexOf("/") + 1, urlRepo.indexOf(".git"))

    createClasspathFolder(urlRepo, branchName, folderName)
    const projectPath = test.data[0].projectpath_udf;
    const classpath = test.data[0].classpath_udf
    const totalClasspath = './' + folderName + projectPath + '/*';
    const lastIndexOfUnderline = testMethod.lastIndexOf("_")
    let command;
    if (configurationTypeName === "isMethod") {
        command = 'java -cp "' + totalClasspath + '" JUnitCmdLineWrapper ' + testPath + ' ' + testMethod.substring(0, lastIndexOfUnderline)
    } else if (configurationTypeName === "isClass") {
        command = 'java -cp "' + totalClasspath + '" JUnitCmdLineWrapper ' + testPath + ' ' + null;
    } else {
        command = 'java -cp "' + totalClasspath + '" JUnitCmdLineWrapper ' + "RunMeAsAJar" + ' ' + null
    }
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

    if (fs.existsSync('./testResults')) {
        fs.rmdirSync('./testResults', {recursive: true})
    }

    const commandsArray = [];

    for (const [testPath, testMethods] of classAndTestsMap) {
        for (const testMethod of testMethods) {
            await getCommand(testPath, testMethod).then((command) => {
                fs.appendFileSync('./command_to_execute.bat', command + "\n")
            })
        }
    }
    // let isFirstTestFromASuite = true;
    // for (const command of commandsArray) {
    //     const cmd = command.split('JUnitCmdLineWrapper')
    //     const cmdUpdated = cmd[0] + 'JUnitCmdLineWrapper' + ' ' + isFirstTestFromASuite + cmd[1];
    //     if (isFirstTestFromASuite === true) {
    //         isFirstTestFromASuite = false;
    //     }
    //     if (process.platform === "win32") {
    //         fs.appendFileSync('./command_to_execute.bat', cmdUpdated + "\n")
    //     } else {
    //         fs.appendFileSync('./command_to_execute.sh', cmdUpdated + "\n")
    //     }
    // }
}

getExecutableFile(process.env.testsToRunConverted)
// getExecutableFile('domains.animals.AnimalTest#checkCatName_23455+SilkCentralName_1234,domains.jobs.TeacherTest#checkAge_23455')










