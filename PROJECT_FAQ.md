# Z-ZERO Project FAQ & Business Logic

## 💰 Deposit & Wallet Logic

### Q: What happens if I select USDT on the UI but send USDC (or vice versa) on the same network?
**Answer:** The system is designed to be robust. While the UI helps guide you, our Backend does not rely on your UI selection. Instead:
1. It validates the **Transaction Hash** directly on the blockchain.
2. It verifies that the funds were sent to your unique **Custodial Deposit Address**.
3. It checks the token contract address against our **Whitelist** for that specific chain.
4. If the token is a supported stablecoin (e.g., you sent USDC on Ethereum, even if you selected USDT), the system will automatically detect the token type, calculate its value, and credit your **Internal USD Balance**.

**Summary:** As long as you send a **supported stablecoin** to the **correct network address**, your balance will be credited correctly regardless of your UI selection.

### Q: Why do I see a 30-minute countdown for my card?
**Answer:** Z-ZERO uses a **Just-In-Time (JIT)** payment model. To ensure maximum security:
1. When an AI Agent requests a payment, we create a temporary "Tokenized Card".
2. This card is valid for only **30 minutes**.
3. If not used within this window, the card is "Burned" (deactivated), and the allocated funds are **automatically refunded** to your main wallet balance.
4. Total loss exposure is limited to the card's specific limit, and only for that 30-minute window.

### Q: Are my real card details exposed to the AI or to me?
**Answer:** No. This is the core of Z-ZERO's **Zero-Trust** philosophy.
1. **To the AI:** The Agent only receives a temporary token. It never sees the full card number (PAN), CVV, or Expiry.
2. **To the Human (You):** The dashboard specifically **hides all card details**. You will only see identifying labels like "Card #0001", active limits, and countdown timers. This ensures that even if your dashboard session is compromised, your financial credentials remain secure. The cards are for machines to use, not for humans to copy.

## 🤖 Agent Management

### Q: Can an AI Agent drain my whole wallet?
**Answer:** No. Every card request must specify an `allocated_limit`. The system will only issue a card for that specific amount (pre-deducted from your balance). An agent cannot spend more than the limit sếp has authorized for that specific transaction.
