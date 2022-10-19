import * as https from 'https';
import * as fs from 'fs';

export async function downloadFile(url: string, targetPath: string, timeoutInMs?: number): Promise<void> {
    const timeoutAt = getCurrentTime() + (timeoutInMs || 4000);
    let downloadComplete = false;

    const targetStream = fs.createWriteStream(targetPath);
    targetStream.on('finish', () => downloadComplete = true);
    const request = https.get(url, (response: any) => {
        response.pipe(targetStream);
    });

    while (!downloadComplete) {
        await delay(500);
        if (timeoutAt < getCurrentTime()) {
            throw new Error('Timeout exceeded.');
        }
    }
}

function getCurrentTime(): number {
    return (new Date()).valueOf();
}
function isTimeout(timeoutAt: number | undefined): boolean {
    return timeoutAt !== undefined ? (getCurrentTime() > timeoutAt) : false;
}

export function getTimeSpanString(ms: number): string {
    let seconds = Math.floor(ms / 1000);
    const secondsPerDay = 60 * 60 * 24;
    const days = Math.floor(seconds / secondsPerDay);
    seconds = seconds - days * secondsPerDay;
    const hours = Math.floor(seconds / 3600);
    seconds = seconds - hours * 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;

    return [
        days>0 ? `${hours} day(s)` : '',
        hours>0 ? `${hours} hour(s)` : '',
        minutes>0 ? `${hours} minute(s)` : '',
        seconds>0 ? `${hours} second(s)` : ''
    ].filter(x => x !== '').join(' ') || '0 seconds';
}

export async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function repeatUntil<T>(
    fun: () => Promise<T>,
    options: {
        intervalInMs: number;
        timeoutInMs: number;
        timeoutMsg: string;
    },
    untilPredicate?: (x: T) => boolean
): Promise<NonNullable<T>> {
    const timeoutAt = (new Date()).valueOf() + options.timeoutInMs;
    do {
        const result = await fun();
        if (result !== null && (untilPredicate === undefined || untilPredicate(result))) {
            return result as NonNullable<T>;
        } else {
            await delay(options.intervalInMs);
            if (isTimeout(timeoutAt)) {
                throw new Error(options.timeoutMsg);
            }
        }
        // eslint-disable-next-line no-constant-condition
    } while (true);
}
