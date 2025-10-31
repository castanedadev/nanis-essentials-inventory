#!/usr/bin/env python3
"""
Enhanced script to analyze financial data from the cosmetics inventory JSON backup
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

    print("=== ANÁLISIS FINANCIERO COMPLETO - NANIS ESSENTIALS ===\n")

    # Extract data sections
    items = data.get('items', [])
    purchases = data.get('purchases', [])
    sales = data.get('sales', [])
    transactions = data.get('transactions', [])
    revenue_withdrawals = data.get('revenueWithdrawals', [])

    print(f"Datos encontrados:")
    print(f"- {len(items)} productos en inventario")
    print(f"- {len(purchases)} compras realizadas")
    print(f"- {len(sales)} ventas realizadas")
    print(f"- {len(transactions)} transacciones adicionales")
    print(f"- {len(revenue_withdrawals)} retiros de ingresos")

    # Analyze purchases (egresos/inversión)
    total_investment = analyze_purchases(purchases)

    # Analyze sales (ingresos)
    total_revenue, sales_by_month = analyze_sales(sales)

    # Analyze additional transactions
    analyze_additional_transactions(transactions, revenue_withdrawals)

    # Calculate break-even and recovery time
    calculate_breakeven_analysis(total_investment, total_revenue, sales_by_month, sales)

def analyze_purchases(purchases):
    """Analyze purchase data to calculate total investment"""
    print(f"\n=== ANÁLISIS DE COMPRAS (EGRESOS) ===")

    total_investment = 0
    purchases_by_month = defaultdict(float)

    for purchase in purchases:
        # Extract cost components
        subtotal = purchase.get('subtotal', 0)
        tax = purchase.get('tax', 0)
        shipping_us = purchase.get('shippingUS', 0)
        shipping_intl = purchase.get('shippingIntl', 0)

        total_cost = subtotal + tax + shipping_us + shipping_intl
        total_investment += total_cost

        # Get date for monthly breakdown
        created_at = purchase.get('createdAt') or purchase.get('orderedDate')
        if created_at:
            try:
                # Parse ISO date format
                date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                month_key = date_obj.strftime('%Y-%m')
                purchases_by_month[month_key] += total_cost
            except:
                pass

        print(f"\nCompra ID: {purchase.get('id', 'N/A')}")
        print(f"  Fecha: {created_at}")
        print(f"  Subtotal: ${subtotal:.2f}")
        print(f"  Impuestos: ${tax:.2f}")
        print(f"  Envío US: ${shipping_us:.2f}")
        print(f"  Envío Intl: ${shipping_intl:.2f}")
        print(f"  Total: ${total_cost:.2f}")

        # Show purchase lines if available
        lines = purchase.get('lines', [])
        if lines:
            print(f"  Productos comprados:")
            for line in lines:
                item_name = line.get('itemName', 'Sin nombre')
                quantity = line.get('quantity', 0)
                unit_cost = line.get('unitCostPostShipping', 0)
                print(f"    - {item_name}: {quantity} unidades @ ${unit_cost:.2f} c/u")

    print(f"\n📊 RESUMEN DE COMPRAS:")
    print(f"Inversión total: ${total_investment:.2f}")

    if purchases_by_month:
        print(f"\nCompras por mes:")
        for month, amount in sorted(purchases_by_month.items()):
            print(f"  {month}: ${amount:.2f}")

    return total_investment

def analyze_sales(sales):
    """Analyze sales data to calculate total revenue"""
    print(f"\n=== ANÁLISIS DE VENTAS (INGRESOS) ===")

    total_revenue = 0
    sales_by_month = defaultdict(float)
    sales_details = []

    for sale in sales:
        sale_amount = sale.get('totalAmount', 0)
        total_revenue += sale_amount

        # Get date for monthly breakdown
        created_at = sale.get('createdAt')
        sale_date = None
        if created_at:
            try:
                # Parse ISO date format
                date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                month_key = date_obj.strftime('%Y-%m')
                sales_by_month[month_key] += sale_amount
                sale_date = date_obj.strftime('%Y-%m-%d')
            except:
                pass

        sale_info = {
            'date': sale_date,
            'amount': sale_amount,
            'buyer': sale.get('buyerName', 'N/A'),
            'payment_method': sale.get('paymentMethod', 'N/A')
        }
        sales_details.append(sale_info)

        print(f"\nVenta ID: {sale.get('id', 'N/A')}")
        print(f"  Fecha: {sale_date}")
        print(f"  Cliente: {sale.get('buyerName', 'N/A')}")
        print(f"  Método de pago: {sale.get('paymentMethod', 'N/A')}")
        print(f"  Total: ${sale_amount:.2f}")

        # Show sale lines if available
        lines = sale.get('lines', [])
        if lines:
            print(f"  Productos vendidos:")
            for line in lines:
                item_name = line.get('itemName', 'Sin nombre')
                quantity = line.get('quantity', 0)
                unit_price = line.get('unitPrice', 0)
                line_total = line.get('totalAmount', quantity * unit_price)
                print(f"    - {item_name}: {quantity} unidades @ ${unit_price:.2f} = ${line_total:.2f}")

    print(f"\n📊 RESUMEN DE VENTAS:")
    print(f"Ingresos totales: ${total_revenue:.2f}")

    if sales_by_month:
        print(f"\nVentas por mes:")
        for month, amount in sorted(sales_by_month.items()):
            print(f"  {month}: ${amount:.2f}")

    return total_revenue, sales_by_month

def analyze_additional_transactions(transactions, revenue_withdrawals):
    """Analyze additional transactions and withdrawals"""
    print(f"\n=== ANÁLISIS DE TRANSACCIONES ADICIONALES ===")

    print(f"\nTransacciones diversas ({len(transactions)}):")
    for transaction in transactions:
        print(f"  - {transaction.get('description', 'Sin descripción')}: ${transaction.get('amount', 0):.2f}")
        print(f"    Tipo: {transaction.get('type', 'N/A')}")
        print(f"    Categoría: {transaction.get('category', 'N/A')}")

    total_withdrawals = 0
    print(f"\nRetiros de ingresos ({len(revenue_withdrawals)}):")
    for withdrawal in revenue_withdrawals:
        amount = withdrawal.get('amount', 0)
        total_withdrawals += amount
        print(f"  - ${amount:.2f} - {withdrawal.get('reason', 'Sin razón')}")
        print(f"    Fecha: {withdrawal.get('withdrawnAt', 'N/A')}")

    print(f"\nTotal retirado: ${total_withdrawals:.2f}")

def calculate_breakeven_analysis(total_investment, total_revenue, sales_by_month, sales_data):
    """Calculate break-even point and investment recovery time"""
    print(f"\n=== CÁLCULO DEL PUNTO DE EQUILIBRIO ===")

    print(f"💰 Inversión total: ${total_investment:.2f}")
    print(f"💵 Ingresos totales: ${total_revenue:.2f}")

    if total_revenue > 0:
        profit = total_revenue - total_investment
        print(f"💸 Ganancia/Pérdida neta: ${profit:.2f}")

        if profit > 0:
            print(f"✅ ¡Tu negocio está generando ganancias!")
            roi = (profit / total_investment) * 100
            print(f"📈 ROI (Retorno de Inversión): {roi:.1f}%")
        else:
            remaining_to_breakeven = abs(profit)
            print(f"⚠️  Aún necesitas ${remaining_to_breakeven:.2f} más en ventas para alcanzar el punto de equilibrio")

    # Calculate average monthly sales
    if sales_by_month:
        months_with_sales = len(sales_by_month)
        avg_monthly_sales = total_revenue / months_with_sales
        print(f"\n📅 ANÁLISIS TEMPORAL:")
        print(f"Meses con ventas: {months_with_sales}")
        print(f"Promedio mensual de ventas: ${avg_monthly_sales:.2f}")

        # Estimate time to break even if still needed
        if total_revenue < total_investment:
            remaining_amount = total_investment - total_revenue
            months_to_breakeven = remaining_amount / avg_monthly_sales if avg_monthly_sales > 0 else float('inf')
            print(f"⏰ Tiempo estimado para punto de equilibrio: {months_to_breakeven:.1f} meses")
        else:
            # Calculate how long it took to break even
            cumulative_revenue = 0
            months_to_breakeven = 0
            for month in sorted(sales_by_month.keys()):
                cumulative_revenue += sales_by_month[month]
                months_to_breakeven += 1
                if cumulative_revenue >= total_investment:
                    print(f"🎯 Punto de equilibrio alcanzado en: {months_to_breakeven} meses")
                    break

    # Calculate profit margins
    if total_revenue > 0 and total_investment > 0:
        profit_margin = ((total_revenue - total_investment) / total_revenue) * 100
        markup = ((total_revenue - total_investment) / total_investment) * 100
        print(f"\n📊 ANÁLISIS DE MÁRGENES:")
        print(f"Margen de ganancia: {profit_margin:.1f}%")
        print(f"Markup sobre costo: {markup:.1f}%")

    # Monthly trend analysis
    if len(sales_by_month) > 1:
        print(f"\n📈 TENDENCIA DE VENTAS:")
        months = sorted(sales_by_month.keys())
        recent_months = months[-3:] if len(months) >= 3 else months

        if len(recent_months) >= 2:
            early_avg = sum(sales_by_month[month] for month in recent_months[:len(recent_months)//2]) / (len(recent_months)//2)
            recent_avg = sum(sales_by_month[month] for month in recent_months[len(recent_months)//2:]) / (len(recent_months) - len(recent_months)//2)

            if recent_avg > early_avg:
                growth = ((recent_avg - early_avg) / early_avg) * 100
                print(f"✅ Tendencia positiva: crecimiento de {growth:.1f}% en ventas")
            else:
                decline = ((early_avg - recent_avg) / early_avg) * 100
                print(f"⚠️  Tendencia negativa: reducción de {decline:.1f}% en ventas")

    print(f"\n=== RECOMENDACIONES ===")
    if total_revenue >= total_investment:
        print("🎉 ¡Felicidades! Has recuperado tu inversión.")
        print("💡 Considera reinvertir las ganancias para expandir el inventario.")
        print("📊 Analiza qué productos tienen mejor margen para enfocar esfuerzos.")
    else:
        print("🎯 Estrategias para alcanzar el punto de equilibrio:")
        print("   - Enfócate en productos con mayor margen de ganancia")
        print("   - Considera estrategias de marketing para aumentar ventas")
        print("   - Revisa precios para asegurar márgenes saludables")
        print("   - Analiza costos de envío y otros gastos operativos")

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