/**
 * TransactionHistory.java
 * Author: Rikin Shah
 * Date: 2024-01-15
 * 
 * This class represents a transaction in the stock portfolio system.
 * It stores information about stock transactions including ticker, date, type, quantity, and cost basis.
 */

import java.text.SimpleDateFormat;
import java.util.Date;

public class TransactionHistory {
    // Private fields as required
    private String ticker;
    private String transDate;
    private String transType;
    private double qty;
    private double costBasis;

    // Default constructor
    public TransactionHistory() {
        this.ticker = "";
        this.transDate = "";
        this.transType = "";
        this.qty = 0.0;
        this.costBasis = 0.0;
    }

    // Overloaded constructor
    public TransactionHistory(String ticker, String transDate, String transType, double qty, double costBasis) {
        this.ticker = ticker;
        this.transDate = transDate;
        this.transType = transType;
        this.qty = qty;
        this.costBasis = costBasis;
    }

    // Getter methods
    public String getTicker() {
        return ticker;
    }

    public String getTransDate() {
        return transDate;
    }

    public String getTransType() {
        return transType;
    }

    public double getQty() {
        return qty;
    }

    public double getCostBasis() {
        return costBasis;
    }

    // Setter methods
    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public void setTransDate(String transDate) {
        this.transDate = transDate;
    }

    public void setTransType(String transType) {
        this.transType = transType;
    }

    public void setQty(double qty) {
        this.qty = qty;
    }

    public void setCostBasis(double costBasis) {
        this.costBasis = costBasis;
    }

    // toString method
    @Override
    public String toString() {
        return String.format("%-12s %-12s %-12.2f $%-12.2f %-12s", 
            transDate, ticker, qty, costBasis, transType);
    }
}