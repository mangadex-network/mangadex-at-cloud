export enum LogLevel {
    None = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4,
    Trace = 5,
    All = 99
}

export function LogInit(loglevel: LogLevel): void {

    function head(type: string) {
        return (new Date().toISOString() + ' <' + type + '>').padEnd(34, ' ');
    }
    
    const error = console.error;
    console.error = function(...params: unknown[]) {
        if(loglevel > 0) {
            error('\x1b[91m' + head('ERROR'), ...params, '\x1b[0m');
        }
    }
    
    const warn = console.warn;
    console.warn = function(...params: unknown[]) {
        if(loglevel > 1) {
            warn('\x1b[33m' + head('WARN'), ...params, '\x1b[0m');
        }
    }
    
    const info = console.info;
    console.info = function(...params: unknown[]) {
        if(loglevel > 2) {
            info('\x1b[0m' + head('INFO'), ...params, '\x1b[0m');
        }
    }
    
    const debug = console.debug;
    console.debug = function(...params: unknown[]) {
        if(loglevel > 3) {
            debug('\x1b[2m' + head('DEBUG'), ...params, '\x1b[0m');
        }
    }
    
    const trace = console.trace;
    console.trace = function(...params: unknown[]) {
        if(loglevel > 4) {
            //trace('\x1b[2m' + head('TRACE'), ...params, '\x1b[0m');
            console.log('\x1b[2m' + head('TRACE'), ...params, new Error().stack.replace(/error:/i, ''), '\x1b[0m');
        }
    }
}