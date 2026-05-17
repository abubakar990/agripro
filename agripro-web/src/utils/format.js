export const formatPKR = (amount) => {
  return "Rs " + Number(amount || 0).toLocaleString("en-PK");
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export const formatNumber = (num) => {
  return Number(num || 0).toLocaleString("en-PK");
};
