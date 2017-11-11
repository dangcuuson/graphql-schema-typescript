import * as childProcess from 'child_process';

export const executeCommand = (command: string, options: childProcess.ExecOptions = {}) => {
    return new Promise((resolve, reject) => {
        const process = childProcess.exec(command);

        process.stdout.on('data', console.log);
        process.stderr.on('data', console.error);

        process.on('close', (exitCode: number) => {
            if (exitCode !== 0) {
                reject(`Command: ${command} return non-0 exit code: ${exitCode}`);
            } else {
                resolve();
            }
        });
        process.on('error', err => {
            console.error(err);
            reject(err);
        });
    });
};