/**
 * Transaction.java
 * Student: John Doe
 * Assignment: Java Portfolio Application
 * 
 * This class represents a single stock transaction
 * with symbol, quantity, price, and type.
 */

public class Transaction {
    private String symbol;
    private int quantity;
    private double price;
    private String type;
    private String date;
    
    // Constructor
    public Transaction(String symbol, int quantity, double price, String type) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
        this.type = type;
        this.date = java.time.LocalDate.now().toString();
    }
    
    // Getters
    public String getSymbol() {
        return symbol;
    }
    
    public int getQuantity() {
        return quantity;
    }
    
    public double getPrice() {
        return price;
    }
    
    public String getType() {
        return type;
    }
    
    public String getDate() {
        return date;
    }
    
    public double getAmount() {
        return quantity * price;
    }
    
    // Setters
    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }
    
    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
    
    public void setPrice(double price) {
        this.price = price;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    // toString method
    @Override
    public String toString() {
        return String.format("%s %d shares of %s at $%.2f (Total: $%.2f) - %s", 
                           type, quantity, symbol, price, getAmount(), date);
    }
    
    // equals method
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        
        Transaction that = (Transaction) obj;
        return quantity == that.quantity &&
               Double.compare(that.price, price) == 0 &&
               symbol.equals(that.symbol) &&
               type.equals(that.type);
    }
    
    // hashCode method
    @Override
    public int hashCode() {
        return java.util.Objects.hash(symbol, quantity, price, type);
    }
}
