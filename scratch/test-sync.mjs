// Test script for /api/pos/sync-transaction
async function runTest() {
  const payload = {
    clientTransactionId: "QP-TXN-MADINA-TEST-001",
    tenantId: "MADINA-KIR",
    invoiceNumber: "INV-202610-TEST01",
    cashierUid: "cashier-01",
    cashierName: "Muhammad Tariq",
    totalAmount: 770,
    subtotal: 770,
    discountAmount: 0,
    taxAmount: 0,
    paymentMethod: "cash",
    amountPaid: 1000,
    changeReturned: 230,
    udhaarAmount: 0,
    items: [
      {
        productId: "prod-001",
        productName: "Shan Biryani Masala 50g",
        unit: "pcs",
        quantity: 1,
        unitPrice: 120,
        discount: 0,
        totalPrice: 120,
      },
      {
        productId: "prod-002",
        productName: "Tapal Danedar Tea 450g",
        unit: "pcs",
        quantity: 1,
        unitPrice: 650,
        discount: 0,
        totalPrice: 650,
      },
    ],
    createdLocallyAt: new Date().toISOString(),
    deviceId: "QP-DEV-PRIMARY-TEST",
  };

  console.log("1. Dispatching initial sync packet to /api/pos/sync-transaction...");
  const res1 = await fetch("http://localhost:3000/api/pos/sync-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data1 = await res1.json();
  console.log("Initial Sync Result:", data1);

  console.log("\n2. Dispatching DUPLICATE sync packet to test idempotency...");
  const res2 = await fetch("http://localhost:3000/api/pos/sync-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data2 = await res2.json();
  console.log("Duplicate Sync Result (Idempotency Test):", data2);
}

runTest().catch(console.error);
