export const formatPKR = (amount) => {
  const num = Number(amount || 0);
  if (isNaN(num)) return "Rs 0";
  return "Rs " + num.toLocaleString("en-PK");
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return "—";
  return dateObj.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export const formatNumber = (num) => {
  return Number(num || 0).toLocaleString("en-PK");
};
