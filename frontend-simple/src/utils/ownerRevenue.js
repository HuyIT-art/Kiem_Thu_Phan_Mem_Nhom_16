export function getTransactionOwners(transaction) {
  const owners = new Map();
  for (const detail of transaction.DAT_PHONG?.CHI_TIET_DAT_PHONG || []) {
    const owner = detail.HOMESTAY?.CHU_HOMESTAY;
    if (owner) owners.set(owner.MaChu, owner);
  }
  return [...owners.values()];
}

export function summarizeOwnerRevenue(transactions, owners = []) {
  const rows = new Map(owners.map(owner => [owner.MaChu, {
    ...owner, revenue: 0, successfulTransactions: 0,
  }]));
  for (const transaction of transactions) {
    for (const owner of getTransactionOwners(transaction)) {
      if (!rows.has(owner.MaChu)) {
        rows.set(owner.MaChu, { ...owner, revenue: 0, successfulTransactions: 0 });
      }
      if (transaction.TrangThai === 'ThanhCong') {
        const row = rows.get(owner.MaChu);
        row.revenue += Number(transaction.SoTien || 0);
        row.successfulTransactions += 1;
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue || a.MaChu - b.MaChu);
}
