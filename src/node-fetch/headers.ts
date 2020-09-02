/***********************************************************************************************
 *** A very basic API compatible stub replacement for node-fetch, as node-fetch leaks memory ***
 ***********************************************************************************************/ 

export class Headers {

    private _headers: NodeJS.Dict<string | string[]>;

    constructor(headers: NodeJS.Dict<string | string[]>) {
        this._headers = headers;
    }

    public get(key: string): string | undefined {
        let values: string[] = [];
        return values.concat(this._headers[key.toLowerCase()]).pop();
    }
}