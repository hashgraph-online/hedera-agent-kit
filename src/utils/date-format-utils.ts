export function convertStringToTimestamp(input: string): number {
    const date = new Date(input);

    if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
    }

    const timestamp = date.getTime();

    return parseFloat((timestamp / 1000).toFixed(6));
}