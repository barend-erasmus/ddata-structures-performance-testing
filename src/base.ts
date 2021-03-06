import * as fs from 'fs';

export class BasePerformanceTesting<T> {

    protected fileDescriptor: number = null;

    constructor(
        protected dataBlockSize: number,
        protected fileName: string,
        protected name: string,
    ) {
        this.fileDescriptor = fs.openSync(this.fileName, 'w+');
    }

    public dispose(): void {
        fs.closeSync(this.fileDescriptor);
        fs.unlinkSync(this.fileName);
    }

    public toString(): string {
        return this.name;
    }

    protected async findAtIndex(index: number): Promise<T> {
        const buffer: Buffer = await this.fsRead(index);

        if (!buffer) {
            return null;
        }

        const str: string = buffer.toString().replace(/\0/g, '');

        if (!str) {
            return null;
        }

        return JSON.parse(str).value;
    }

    private fsRead(index: number): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const buffer: Buffer = new Buffer(this.dataBlockSize);

            const position: number = this.dataBlockSize * index;

            if (position < 0) {
                resolve(null);
                return;
            }

            fs.read(this.fileDescriptor, buffer, 0, this.dataBlockSize, position, (err: Error, bytesRead: number, bf: Buffer) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(buffer);
            });
        });
    }

    private fsSync(): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.fsync(this.fileDescriptor, (err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    private fsWrite(content: string, index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const buffer: Buffer = Buffer.from(content);

            fs.write(this.fileDescriptor, buffer, 0, buffer.length, this.dataBlockSize * index, (err: Error, written: number, bf: Buffer) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    protected async insertAtIndex(index: number, obj: T): Promise<void> {
        let str: string = JSON.stringify({
            value: obj,
        });

        str = this.padString(this.dataBlockSize, str);

        await this.fsWrite(str, index);

        await this.fsSync();
    }

    private padString(length: number, str: string): string {
        while (str.length < length) {
            str += '\0';
        }

        return str;
    }

}
