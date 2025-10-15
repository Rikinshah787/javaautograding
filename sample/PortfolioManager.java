/**
 * PortfolioManager.java
 * Author: Rikin Shah
 * Date: 2024-01-15
 * 
 * This class manages the stock portfolio system with menu-driven interface.
 * It handles transactions, displays history, and manages portfolio information.
 */

import java.util.ArrayList;
import java.util.Scanner;
import java.text.SimpleDateFormat;
import java.util.Date;

public class PortfolioManager {
    // Private field for ArrayList as required
    private ArrayList<TransactionHistory> portfolioList = new ArrayList<TransactionHistory>();
    
    // Scanner for user input
    private Scanner scanner = new Scanner(System.in);
    
    // Student name for display
    private String studentName = "Rikin Shah";

    public static void main(String[] args) {
        PortfolioManager portfolio = new PortfolioManager();
        portfolio.run();
    }

    public void run() {
        int choice;
        
        do {
            displayMenu();
            try {
                choice = Integer.parseInt(scanner.nextLine());
                processChoice(choice);
            } catch (NumberFormatException e) {
                System.out.println("❌ Error: Please enter a valid number (0-6)");
                choice = -1;
            }
        } while (choice != 0);
        
        System.out.println("Thank you for using the Portfolio Manager!");
        scanner.close();
    }

    private void displayMenu() {
        System.out.println("\n" + studentName + " Brokerage Account");
        System.out.println("====================================");
        System.out.println("0 - Exit");
        System.out.println("1 - Deposit Cash");
        System.out.println("2 - Withdraw Cash");
        System.out.println("3 - Buy Stock");
        System.out.println("4 - Sell Stock");
        System.out.println("5 - Display Transaction History");
        System.out.println("6 - Display Portfolio");
        System.out.print("Enter option (0 to 6): ");
    }

    private void processChoice(int choice) {
        switch (choice) {
            case 0:
                System.out.println("Exiting...");
                break;
            case 1:
                depositCash();
                break;
            case 2:
                withdrawCash();
                break;
            case 3:
                buyStock();
                break;
            case 4:
                sellStock();
                break;
            case 5:
                displayTransactionHistory();
                break;
            case 6:
                displayPortfolio();
                break;
            default:
                System.out.println("❌ Error: Invalid option. Please choose 0-6.");
        }
    }

    private void depositCash() {
        System.out.print("Enter deposit amount: $");
        try {
            double amount = Double.parseDouble(scanner.nextLine());
            if (amount > 0) {
                TransactionHistory deposit = new TransactionHistory("CASH", getCurrentDate(), "DEPOSIT", amount, 1.00);
                portfolioList.add(deposit);
                System.out.println("✅ $" + amount + " deposited successfully!");
            } else {
                System.out.println("❌ Error: Deposit amount must be positive.");
            }
        } catch (NumberFormatException e) {
            System.out.println("❌ Error: Please enter a valid number.");
        }
    }

    private void withdrawCash() {
        double availableCash = getAvailableCash();
        System.out.print("Enter withdrawal amount: $");
        try {
            double amount = Double.parseDouble(scanner.nextLine());
            if (amount > 0) {
                if (amount <= availableCash) {
                    TransactionHistory withdrawal = new TransactionHistory("CASH", getCurrentDate(), "WITHDRAW", -amount, 1.00);
                    portfolioList.add(withdrawal);
                    System.out.println("✅ $" + amount + " withdrawn successfully!");
                } else {
                    System.out.println("❌ Error: Insufficient funds. Available: $" + availableCash);
                }
            } else {
                System.out.println("❌ Error: Withdrawal amount must be positive.");
            }
        } catch (NumberFormatException e) {
            System.out.println("❌ Error: Please enter a valid number.");
        }
    }

    private void buyStock() {
        System.out.print("Enter stock ticker: ");
        String ticker = scanner.nextLine().toUpperCase();
        System.out.print("Enter quantity: ");
        try {
            double quantity = Double.parseDouble(scanner.nextLine());
            System.out.print("Enter price per share: $");
            double price = Double.parseDouble(scanner.nextLine());
            
            if (quantity > 0 && price > 0) {
                double totalCost = quantity * price;
                double availableCash = getAvailableCash();
                
                if (totalCost <= availableCash) {
                    // Add stock transaction
                    TransactionHistory stockTransaction = new TransactionHistory(ticker, getCurrentDate(), "BUY", quantity, price);
                    portfolioList.add(stockTransaction);
                    
                    // Add cash withdrawal
                    TransactionHistory cashWithdrawal = new TransactionHistory("CASH", getCurrentDate(), "WITHDRAW", -totalCost, 1.00);
                    portfolioList.add(cashWithdrawal);
                    
                    System.out.println("✅ Bought " + quantity + " shares of " + ticker + " at $" + price + " per share!");
                } else {
                    System.out.println("❌ Error: Insufficient funds. Required: $" + totalCost + ", Available: $" + availableCash);
                }
            } else {
                System.out.println("❌ Error: Quantity and price must be positive.");
            }
        } catch (NumberFormatException e) {
            System.out.println("❌ Error: Please enter valid numbers.");
        }
    }

    private void sellStock() {
        System.out.print("Enter stock ticker: ");
        String ticker = scanner.nextLine().toUpperCase();
        System.out.print("Enter quantity to sell: ");
        try {
            double quantity = Double.parseDouble(scanner.nextLine());
            System.out.print("Enter selling price per share: $");
            double price = Double.parseDouble(scanner.nextLine());
            
            if (quantity > 0 && price > 0) {
                double availableShares = getAvailableShares(ticker);
                
                if (quantity <= availableShares) {
                    // Add stock transaction
                    TransactionHistory stockTransaction = new TransactionHistory(ticker, getCurrentDate(), "SELL", -quantity, price);
                    portfolioList.add(stockTransaction);
                    
                    // Add cash deposit
                    double totalProceeds = quantity * price;
                    TransactionHistory cashDeposit = new TransactionHistory("CASH", getCurrentDate(), "DEPOSIT", totalProceeds, 1.00);
                    portfolioList.add(cashDeposit);
                    
                    System.out.println("✅ Sold " + quantity + " shares of " + ticker + " at $" + price + " per share!");
                } else {
                    System.out.println("❌ Error: Insufficient shares. Available: " + availableShares + " shares of " + ticker);
                }
            } else {
                System.out.println("❌ Error: Quantity and price must be positive.");
            }
        } catch (NumberFormatException e) {
            System.out.println("❌ Error: Please enter valid numbers.");
        }
    }

    private void displayTransactionHistory() {
        System.out.println("\n" + studentName + " Brokerage Account");
        System.out.println("====================================");
        System.out.println();
        System.out.printf("%-12s %-12s %-12s %-12s %-12s%n", 
            "Date", "Ticker", "Quantity", "Cost Basis", "Trans Type");
        System.out.println("================================================================");
        
        for (TransactionHistory transaction : portfolioList) {
            System.out.println(transaction.toString());
        }
        
        if (portfolioList.isEmpty()) {
            System.out.println("No transactions found.");
        }
    }

    private void displayPortfolio() {
        System.out.println("\nPortfolio as of: " + getCurrentDateTime());
        System.out.println("====================================");
        System.out.println();
        System.out.printf("%-12s %-12s%n", "Ticker", "Quantity");
        System.out.println("================================");
        
        // Calculate portfolio holdings
        java.util.Map<String, Double> holdings = new java.util.HashMap<>();
        
        for (TransactionHistory transaction : portfolioList) {
            String ticker = transaction.getTicker();
            double qty = transaction.getQty();
            
            holdings.put(ticker, holdings.getOrDefault(ticker, 0.0) + qty);
        }
        
        // Display holdings
        for (java.util.Map.Entry<String, Double> entry : holdings.entrySet()) {
            if (entry.getValue() != 0) {
                System.out.printf("%-12s %-12.2f%n", entry.getKey(), entry.getValue());
            }
        }
        
        if (holdings.isEmpty()) {
            System.out.println("Portfolio is empty.");
        }
    }

    private double getAvailableCash() {
        double cash = 0.0;
        for (TransactionHistory transaction : portfolioList) {
            if (transaction.getTicker().equals("CASH")) {
                cash += transaction.getQty();
            }
        }
        return cash;
    }

    private double getAvailableShares(String ticker) {
        double shares = 0.0;
        for (TransactionHistory transaction : portfolioList) {
            if (transaction.getTicker().equals(ticker)) {
                shares += transaction.getQty();
            }
        }
        return shares;
    }

    private String getCurrentDate() {
        SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yyyy");
        return sdf.format(new Date());
    }

    private String getCurrentDateTime() {
        SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss");
        return sdf.format(new Date());
    }
}