#!/usr/bin/env python3
"""
Script to analyze financial data from the cosmetics inventory JSON backup
to calculate break-even point and investment recovery time.
"""

import json
from datetime import datetime
from collections import defaultdict

def load_json_data(file_path):
    """Load the large JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_financial_data(data):
    """Analyze the financial data structure and extract key metrics"""

    # Initialize counters and totals
    total_investment = 0
    total_revenue = 0
    total_cost = 0
    transactions = []
    items_analysis = []

    print("=== ANÁLISIS FINANCIERO - NANIS ESSENTIALS ===\n")

    # Check the structure of the data
    print("Estructura de datos encontrada:")
    if isinstance(data, dict):
        print(f"Claves principales: {list(data.keys())}")

        # Look for different sections
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 0:
                print(f"\n{key}: {len(value)} elementos")
                if isinstance(value[0], dict):
                    sample_keys = list(value[0].keys())
                    print(f"  Campos de muestra: {sample_keys[:10]}")

                    # Analyze items/inventory data
                    if 'stock' in sample_keys or 'price' in sample_keys or 'cost' in sample_keys:
                        print(f"  -> Datos de inventario encontrados en '{key}'")
                        analyze_inventory_items(value, items_analysis)

                    # Look for transaction data
                    if 'date' in sample_keys or 'amount' in sample_keys or 'total' in sample_keys:
                        print(f"  -> Posibles transacciones encontradas en '{key}'")
                        analyze_transactions(value, transactions)

    # Analyze items for cost/revenue calculation
    print("\n=== ANÁLISIS DE PRODUCTOS ===")

    for item in items_analysis:
        print(f"\nProducto: {item.get('name', 'Sin nombre')}")
        print(f"  Stock actual: {item.get('stock', 0)}")
        print(f"  Precio unitario: ${item.get('price', 0):.2f}")
        print(f"  Costo unitario: ${item.get('cost', 0):.2f}")
        print(f"  Valor del inventario: ${item.get('inventory_value', 0):.2f}")
        print(f"  Costo del inventario: ${item.get('inventory_cost', 0):.2f}")

        total_investment += item.get('inventory_cost', 0)

    print(f"\n=== RESUMEN FINANCIERO ===")
    print(f"Inversión total en inventario: ${total_investment:.2f}")

    # Look for sales/transaction data
    if transactions:
        print(f"\nTransacciones encontradas: {len(transactions)}")
        analyze_sales_data(transactions)
    else:
        print("\nNo se encontraron datos de transacciones explícitas.")
        print("Calculando basado en datos de inventario disponibles...")

        # Calculate potential break-even based on inventory
        calculate_breakeven_from_inventory(items_analysis, total_investment)

def analyze_inventory_items(items, items_analysis):
    """Analyze individual inventory items"""
    for item in items:
        if isinstance(item, dict):
            item_data = {}
            item_data['name'] = item.get('name', 'Sin nombre')
            item_data['stock'] = item.get('stock', 0)

            # Look for price fields
            item_data['price'] = (
                item.get('price', 0) or
                item.get('sellingPrice', 0) or
                item.get('unitPrice', 0) or
                0
            )

            # Look for cost fields
            item_data['cost'] = (
                item.get('cost', 0) or
                item.get('unitCost', 0) or
                item.get('costPrice', 0) or
                0
            )

            # Calculate inventory values
            stock = item_data['stock']
            price = item_data['price']
            cost = item_data['cost']

            item_data['inventory_value'] = stock * price
            item_data['inventory_cost'] = stock * cost
            item_data['category'] = item.get('category', 'Sin categoría')

            items_analysis.append(item_data)

def analyze_transactions(transactions, transaction_list):
    """Analyze transaction data"""
    for transaction in transactions:
        if isinstance(transaction, dict):
            trans_data = {}
            trans_data['date'] = transaction.get('date') or transaction.get('saleDate') or transaction.get('purchaseDate')
            trans_data['amount'] = transaction.get('amount') or transaction.get('total') or transaction.get('price')
            trans_data['type'] = transaction.get('type', 'unknown')
            transaction_list.append(trans_data)

def analyze_sales_data(transactions):
    """Analyze sales transactions to calculate revenue"""
    total_sales = 0
    sales_by_month = defaultdict(float)

    for trans in transactions:
        amount = trans.get('amount', 0)
        if amount > 0:
            total_sales += amount

            # Group by month if date is available
            date_str = trans.get('date')
            if date_str:
                try:
                    # Try different date formats
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
                        try:
                            date_obj = datetime.strptime(date_str, fmt)
                            month_key = date_obj.strftime('%Y-%m')
                            sales_by_month[month_key] += amount
                            break
                        except ValueError:
                            continue
                except:
                    pass

    print(f"Ventas totales: ${total_sales:.2f}")

    if sales_by_month:
        print("\nVentas por mes:")
        for month, sales in sorted(sales_by_month.items()):
            print(f"  {month}: ${sales:.2f}")

def calculate_breakeven_from_inventory(items_analysis, total_investment):
    """Calculate break-even point based on inventory data"""

    total_potential_revenue = 0
    total_margin = 0
    weighted_margin_rate = 0

    print("\n=== ANÁLISIS DE MARGEN POR PRODUCTO ===")

    for item in items_analysis:
        price = item.get('price', 0)
        cost = item.get('cost', 0)
        stock = item.get('stock', 0)

        if price > 0 and cost > 0:
            margin_per_unit = price - cost
            margin_rate = (margin_per_unit / price) * 100 if price > 0 else 0
            potential_revenue = stock * price
            total_margin_for_item = stock * margin_per_unit

            print(f"\n{item['name']}:")
            print(f"  Precio: ${price:.2f} | Costo: ${cost:.2f}")
            print(f"  Margen por unidad: ${margin_per_unit:.2f} ({margin_rate:.1f}%)")
            print(f"  Stock: {stock} unidades")
            print(f"  Ingresos potenciales: ${potential_revenue:.2f}")
            print(f"  Margen total potencial: ${total_margin_for_item:.2f}")

            total_potential_revenue += potential_revenue
            total_margin += total_margin_for_item

    if total_potential_revenue > 0:
        overall_margin_rate = (total_margin / total_potential_revenue) * 100

        print(f"\n=== CÁLCULO DEL PUNTO DE EQUILIBRIO ===")
        print(f"Inversión total: ${total_investment:.2f}")
        print(f"Ingresos potenciales totales: ${total_potential_revenue:.2f}")
        print(f"Margen total potencial: ${total_margin:.2f}")
        print(f"Tasa de margen promedio: {overall_margin_rate:.1f}%")

        # Break-even calculation
        if total_margin > 0:
            # Revenue needed to break even
            breakeven_revenue = total_investment / (overall_margin_rate / 100)

            print(f"\n=== RESULTADOS DEL PUNTO DE EQUILIBRIO ===")
            print(f"Ingresos necesarios para punto de equilibrio: ${breakeven_revenue:.2f}")

            # Percentage of current inventory needed to break even
            inventory_percentage = (breakeven_revenue / total_potential_revenue) * 100
            print(f"Porcentaje del inventario actual a vender: {inventory_percentage:.1f}%")

            # If we have sales data, estimate time to break even
            if total_potential_revenue > total_investment:
                profit_potential = total_margin
                print(f"Ganancia potencial total: ${profit_potential:.2f}")
                print(f"ROI potencial: {(profit_potential / total_investment * 100):.1f}%")

                # Simple time estimates (assuming different sales rates)
                print(f"\n=== ESTIMACIÓN DE TIEMPO DE RECUPERACIÓN ===")
                monthly_sales_scenarios = [
                    ("Ventas muy bajas", breakeven_revenue * 0.1),
                    ("Ventas bajas", breakeven_revenue * 0.2),
                    ("Ventas moderadas", breakeven_revenue * 0.33),
                    ("Ventas altas", breakeven_revenue * 0.5),
                ]

                for scenario, monthly_sales in monthly_sales_scenarios:
                    if monthly_sales > 0:
                        months_to_breakeven = breakeven_revenue / monthly_sales
                        print(f"{scenario} (${monthly_sales:.0f}/mes): {months_to_breakeven:.1f} meses")
            else:
                print(f"\n⚠️  ALERTA: La inversión (${total_investment:.2f}) es mayor que los ingresos potenciales (${total_potential_revenue:.2f})")
                print("Revisar precios de venta o costos de productos.")

def main():
    file_path = "Cosmetics Backup 2025-09-26.json"

    try:
        print("Cargando datos del archivo JSON...")
        data = load_json_data(file_path)
        print("Datos cargados exitosamente.\n")

        analyze_financial_data(data)

    except FileNotFoundError:
        print(f"Error: No se pudo encontrar el archivo {file_path}")
    except json.JSONDecodeError as e:
        print(f"Error al leer el archivo JSON: {e}")
    except Exception as e:
        print(f"Error inesperado: {e}")

if __name__ == "__main__":
    main()