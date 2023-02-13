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
        if (testPath !== "") {
            if (testPath.lastIndexOf('.') > -1) {
                const testPackage = testPath.substring(0, testPath.lastIndexOf('.'))
                const testClass = testPath.substring(testPath.lastIndexOf('.') + 1, testPath.length)
                query = Query.field('name').equal(testMethod).and(Query.field('class_name').equal(testClass)).and(Query.field('package').equal(testPackage)).and(Query.field('component').equal(Query.NULL))
            } else {
                query = Query.field('name').equal(testMethod).and(Query.field('class_name').equal(testPath)).and(Query.field('package').equal(Query.Query.NULL)).and(Query.field('component').equal(Query.NULL))
            }
        } else {
            query = Query.field('name').equal(testMethod).and(Query.field('class_name').equal(Query.NULL)).and(Query.field('package').equal(Query.NULL)).and(Query.field('component').equal(Query.NULL))
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

async function getCommand(testPath, testMethod, runnerJarPath) {
    const test = await getOctaneTest(testPath, testMethod);
    const configurationTypeValue = await getListValueById(test.data[0].configuration_type_udf.id)
    const configurationTypeName = configurationTypeValue.data[0].name
    const urlRepo = test.data[0].repourl_udf;
    const branchName = test.data[0].branch_udf
    const folderName = urlRepo.substring(urlRepo.lastIndexOf("/") + 1, urlRepo.indexOf(".git"))

    createClasspathFolder(urlRepo, branchName, folderName)
    const projectPath = test.data[0].projectpath_udf;
    const classpath = test.data[0].classpath_udf
    const rootClasspath = './' + folderName + projectPath;
    const lastIndexOfUnderline = testMethod.lastIndexOf("_")

    const jars = classpath.split(';')
    let testsClasspath = "";
    jars.forEach(function (value) {
        testsClasspath += rootClasspath + value.substring(1, value.length) + ";"
        console.log(value)

    });
    testsClasspath = testsClasspath.substring(0, testsClasspath.lastIndexOf(';'))

    let command;
    if (configurationTypeName === "isMethod") {
        command = 'java -cp "' + testsClasspath + ";" + runnerJarPath + '" JUnitCmdLineWrapper ' + testPath + ' ' + testMethod.substring(0, lastIndexOfUnderline) + ' ' + testMethod
    } else if (configurationTypeName === "isClass") {
        command = 'java -cp "' + testsClasspath + ";" + runnerJarPath + '" JUnitCmdLineWrapper ' + testPath + ' ' + null + ' ' + testMethod
    } else {
        command = 'java -cp "' + testsClasspath + ";" + runnerJarPath + '" JUnitCmdLineWrapper ' + "RunMeAsAJar" + ' ' + null + ' ' + testMethod
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

async function getExecutableFile(testsToRun, runnerJarPath) {
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

    for (const [testPath, testMethods] of classAndTestsMap) {
        for (const testMethod of testMethods) {
            await getCommand(testPath, testMethod, runnerJarPath).then((command) => {
                fs.appendFileSync('./command_to_execute.bat', command + "\n")
            })
        }
    }
}

getExecutableFile(process.env.testsToRunConverted, process.env.runnerJarPath)
// getExecutableFile('#SCNameForJarBased_1234,domains.animals.AnimalTest#checkCatName_23455+SilkCentralName_1234,domains.jobs.TeacherTest#checkAge_23455', 'D:\\Projects\\SilkCentralDemo\\AutomationDemo\\target\\JunitWrapper-1.0-SNAPSHOT-jar-with-dependencies.jar')
//
//
//







