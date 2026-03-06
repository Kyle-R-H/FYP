/**
 * Check file extension
 */
export function getExtension(filename) {
    var parts = filename.split('.');
    console.log("extension: " + parts[parts.length - 1]);
    return parts[parts.length - 1];
}