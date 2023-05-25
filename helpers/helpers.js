import unidecode from "unidecode";

export function generateUrlSlug(organizerName) {
  const decodedName = unidecode(organizerName);

  return decodedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculatePriceWithVAT(price, vatPercentage) {
  const vat = (price * vatPercentage) / 100;
  const priceWithVAT = price + vat;
  return { vat, priceWithVAT };
}
