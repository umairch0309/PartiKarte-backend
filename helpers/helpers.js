import unidecode from 'unidecode';


export function generateUrlSlug(organizerName) {
    const decodedName = unidecode(organizerName);
    return decodedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}