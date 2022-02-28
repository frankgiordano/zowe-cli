/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import * as nodeJsPath from "path";
import * as tar from "tar";

import { IO, ProcessUtils, ISystemInfo } from "@zowe/imperative";

import { ITestEnvironment, runCliScript } from "@zowe/cli-test-utils";
import { ITestPropertiesSchema } from "../../../../../__tests__/__src__/properties/ITestPropertiesSchema";
import { TestEnvironment } from "../../../../../__tests__/__src__/environment/TestEnvironment";

let testEnvironment: ITestEnvironment<ITestPropertiesSchema>;

describe("Zowe native executable", () => {
    const RUN_IN_BACKGROUND_MSG: string = "command will run in the background ...";
    const WAIT_TO_SEE_RESULTS_MSG: string = "Wait to see the results below ...";
    const NOW_PRESS_ENTER_MSG: string = "Now press ENTER to see your command prompt.";

    let zoweExePath: string;
    let willRunZoweExe: boolean = true;

    beforeAll(async () => {
        // Create the unique test environment
        testEnvironment = await TestEnvironment.setUp({
            testName: "zowe_exe_integration",
            skipProperties: true
        });

        // determine executable file name and TGZ path for our current OS
        const zoweRootDir: string = nodeJsPath.normalize(__dirname + "/../../../../..");
        const prebuildsDir: string = nodeJsPath.normalize(zoweRootDir + "/packages/cli/prebuilds");
        let zoweExeTgzPath: string;
        let zoweExeFileNm: string;
        const sysInfo: ISystemInfo = ProcessUtils.getBasicSystemInfo();
        if (sysInfo.platform == "win32") {
            zoweExeFileNm = "zowe.exe";
            zoweExeTgzPath = nodeJsPath.resolve(prebuildsDir, "zowe-windows.tgz");
        } else if (sysInfo.platform == "linux") {
            zoweExeFileNm = "zowe";
            zoweExeTgzPath = nodeJsPath.resolve(prebuildsDir, "zowe-linux.tgz");
        } else {
            zoweExeFileNm = "zowe";
            zoweExeTgzPath = nodeJsPath.resolve(prebuildsDir, "zowe-macos.tgz");
        }

        // Form the path name to our executable.
        let zoweExeDirPath: string = nodeJsPath.normalize(zoweRootDir + "/zowex/target/release");
        zoweExePath = nodeJsPath.resolve(zoweExeDirPath, zoweExeFileNm);
        if (!IO.existsSync(zoweExePath)) {
            zoweExeDirPath = nodeJsPath.normalize(zoweRootDir + "/zowex/target/debug");
            zoweExePath = nodeJsPath.resolve(zoweExeDirPath, zoweExeFileNm);
            if (!IO.existsSync(zoweExePath)) {
                willRunZoweExe = false;
                zoweExePath = "./NoZoweExeExists";
            }
        }

        // tar our EXE into a TGZ for this platform, so that we can extract it in tests
        if (willRunZoweExe) {
            tar.create({
                sync: true,
                gzip: true,
                cwd: zoweExeDirPath,
                file: zoweExeTgzPath
            }, [zoweExeFileNm]);
        }
    });

    it("should display its version number", async () => {
        if (willRunZoweExe) {
            const response = runCliScript(
                __dirname + "/__scripts__/run_zowe_exe.sh", testEnvironment,
                [zoweExePath, "--version-exe"]
            );
            expect(response.stdout.toString()).toMatch(/[0-9]\.[0-9]\.[0-9]/);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
        }
    });

    it("should run the enable command in the background", async () => {
        if (willRunZoweExe) {
            const response = runCliScript(
                __dirname + "/__scripts__/run_zowe_exe.sh", testEnvironment,
                [zoweExePath, "daemon", "enable"]
            );
            const stdoutStr = response.stdout.toString();
            expect(stdoutStr).toContain(RUN_IN_BACKGROUND_MSG);
            expect(stdoutStr).toContain(WAIT_TO_SEE_RESULTS_MSG);
            expect(stdoutStr).toContain("Zowe CLI daemon mode is enabled");
            expect(stdoutStr).toContain("Zowe CLI native executable version =");
            expect(stdoutStr).toContain(NOW_PRESS_ENTER_MSG);
            expect(response.status).toBe(0);
        }
    });

    it("should run the disable command in the background", async () => {
        if (willRunZoweExe) {
            const response = runCliScript(
                __dirname + "/__scripts__/run_zowe_exe.sh", testEnvironment,
                [zoweExePath, "daemon", "disable"]
            );
            const stdoutStr = response.stdout.toString();
            expect(stdoutStr).toContain(RUN_IN_BACKGROUND_MSG);
            expect(stdoutStr).toContain(WAIT_TO_SEE_RESULTS_MSG);
            expect(stdoutStr).toContain("Zowe CLI daemon mode is disabled");
            expect(stdoutStr).toContain(NOW_PRESS_ENTER_MSG);
            expect(response.status).toBe(0);
        }
    });
});
