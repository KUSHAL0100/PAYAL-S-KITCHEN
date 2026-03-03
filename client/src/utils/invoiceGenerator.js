import jsPDF from 'jspdf';

/**
 * Universal receipt PDF — works for orders AND subscriptions.
 * Pure jsPDF, no DOM rendering, guaranteed non-blank output.
 */
export const downloadInvoicePdf = (data, filename) => {
    try {
        const doc = new jsPDF();
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const L = 18, R = W - 18;
        let y = 18;

        // Detect: subscription has startDate+plan, orders have type
        const isSub = !!data.startDate && !!data.plan && !data.type;

        const br = (need = 15) => { if (y + need > H - 30) { doc.addPage(); y = 20; } };

        // ── HEADER ──
        doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(234, 88, 12);
        doc.text("Payal's Kitchen", L, y);
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(120, 120, 120);
        doc.text('Home-cooked meals delivered fresh  |  +91 9876543210', L, y + 6);
        doc.setDrawColor(230).line(L, y + 9, R, y + 9);
        y += 18;

        // ── TITLE ──
        doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(30, 30, 30);
        doc.text('RECEIPT', L, y);
        const badge = isSub ? 'SUBSCRIPTION'
            : { event: 'CATERING EVENT', single: 'SINGLE TIFFIN', subscription_purchase: 'PLAN PURCHASE', subscription_upgrade: 'PLAN UPGRADE' }[data.type] || 'ORDER';
        doc.setFontSize(8).setTextColor(234, 88, 12);
        doc.text(badge, R, y, { align: 'right' });
        y += 10;

        // ── INFO ──
        const id = String(data._id || '').slice(-8).toUpperCase();
        const name = data.customerName || data.user?.name || data.userId?.name || 'Customer';
        const date = fmtDate(data.paymentDate || data.createdAt);
        const mid = L + (R - L) / 2 + 5;

        const info = (label, val, x) => {
            doc.setFont('helvetica', 'bold').setTextColor(100, 100, 100).setFontSize(8.5);
            doc.text(label, x, y);
            doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30);
            doc.text(String(val || 'N/A').substring(0, 45), x + 28, y);
        };

        info('ID:', `#${id}`, L); info('Customer:', name, mid); y += 6;
        info('Date:', date, L); info('Payment:', data.paymentStatus || (isSub ? data.status : 'N/A'), mid); y += 6;
        info('Status:', data.status || 'N/A', L);
        if (isSub) { info('Meal:', data.mealType === 'both' ? 'Lunch + Dinner' : data.mealType === 'lunch' ? 'Lunch Only' : 'Dinner Only', mid); }
        y += 6;

        // Address
        const addr = data.deliveryAddress
            ? `${data.deliveryAddress.street}, ${data.deliveryAddress.city} - ${data.deliveryAddress.zip}`
            : isSub && data.lunchAddress?.street
                ? `${data.lunchAddress.street}, ${data.lunchAddress.city} - ${data.lunchAddress.zip}`
                : null;
        if (addr) { info('Address:', addr.substring(0, 70), L); y += 6; }

        if (isSub) {
            info('Plan:', `${data.plan?.name || 'N/A'} (${data.plan?.duration || 'N/A'})`, L);
            info('Period:', `${fmtDate(data.startDate)} — ${fmtDate(data.endDate)}`, mid);
            y += 6;
        }
        y += 6;

        // ── ITEMS TABLE (for orders with items) ──
        const items = data.items || [];
        if (items.length > 0) {
            br(12);
            doc.setFillColor(255, 247, 237);
            doc.rect(L, y, R - L, 8, 'F');
            doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(180, 80, 10);
            doc.text('#', L + 2, y + 5.5);
            doc.text('ITEM', L + 12, y + 5.5);
            doc.text('DELIVERY', L + 90, y + 5.5);
            doc.text('QTY', R - 15, y + 5.5, { align: 'center' });
            y += 8;

            items.forEach((item, i) => {
                br(10);
                if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(L, y, R - L, 8, 'F'); }
                doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 40);
                doc.text(String(i + 1), L + 2, y + 5.5);
                doc.text((item.name || 'Item').substring(0, 40), L + 12, y + 5.5);
                const del = item.deliveryDate ? `${fmtDate(item.deliveryDate)}${item.deliveryTime ? ' @ ' + item.deliveryTime : ''}` : '-';
                doc.text(del.substring(0, 30), L + 90, y + 5.5);
                doc.text(String(item.quantity || 1), R - 15, y + 5.5, { align: 'center' });
                y += 8;

                // Expand selectedItems — split comma-joined names into individual lines
                const subs = expandSubs(item.selectedItems);
                subs.forEach(s => {
                    br(7);
                    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(110, 110, 110);
                    doc.text(`  • ${s.substring(0, 60)}`, L + 12, y + 4.5);
                    y += 6;
                });
            });
            doc.setDrawColor(230).line(L, y, R, y);
            y += 6;

        } else if (isSub) {
            // Subscription — show plan row
            br(20);
            doc.setFillColor(238, 242, 255);
            doc.rect(L, y, R - L, 8, 'F');
            doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(79, 70, 229);
            doc.text('PLAN', L + 2, y + 5.5);
            doc.text('DURATION', L + 55, y + 5.5);
            doc.text('MEAL TYPE', L + 100, y + 5.5);
            doc.text('AMOUNT', R - 2, y + 5.5, { align: 'right' });
            y += 8;
            doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 40);
            doc.text(data.plan?.name || 'N/A', L + 2, y + 5.5);
            doc.text(data.plan?.duration || 'N/A', L + 55, y + 5.5);
            doc.text(data.mealType === 'both' ? 'Lunch + Dinner' : data.mealType === 'lunch' ? 'Lunch Only' : 'Dinner Only', L + 100, y + 5.5);
            doc.text(`Rs.${(data.amountPaid || data.planValue || 0).toFixed(2)}`, R - 2, y + 5.5, { align: 'right' });
            y += 8;
            doc.setDrawColor(230).line(L, y, R, y);
            y += 6;
        }

        // ── TOTALS ──
        br(35);
        const tX = R - 70;
        doc.setFontSize(9);

        const total = isSub ? (data.amountPaid || data.planValue || 0) : (data.totalAmount || 0);
        const subtotal = data.price || total;

        const addLine = (label, val, color) => {
            doc.setFont('helvetica', 'normal').setTextColor(...(color || [100, 100, 100]));
            doc.text(label, tX, y);
            doc.setTextColor(30, 30, 30);
            doc.text(val, R, y, { align: 'right' });
            y += 6;
        };

        if (isSub) {
            addLine('Plan Value', `Rs.${(data.planValue || 0).toFixed(2)}`);
            if ((data.planValue || 0) !== (data.amountPaid || 0) && (data.amountPaid || 0) > 0) {
                addLine('Amount Paid', `Rs.${data.amountPaid.toFixed(2)}`);
            }
        } else {
            addLine('Subtotal', `Rs.${subtotal.toFixed(2)}`);
            if ((data.discountAmount || 0) > 0) addLine('Discount', `-Rs.${data.discountAmount.toFixed(2)}`, [234, 88, 12]);
            if ((data.proRataCredit || 0) > 0) addLine('Upgrade Credit', `-Rs.${data.proRataCredit.toFixed(2)}`, [16, 185, 129]);
            if ((data.cancellationFee || 0) > 0) addLine('Cancel Fee', `Rs.${data.cancellationFee.toFixed(2)}`, [220, 38, 38]);
            if ((data.refundAmount || 0) > 0) addLine('Refund', `Rs.${data.refundAmount.toFixed(2)}`, [16, 185, 129]);
        }

        doc.setDrawColor(200).line(tX, y, R, y);
        y += 7;
        doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(30, 30, 30);
        doc.text('Total Paid', tX, y);
        doc.setTextColor(234, 88, 12);
        doc.text(`Rs.${total.toFixed(2)}`, R, y, { align: 'right' });

        // Transaction ID
        if (data.paymentId) {
            y += 8;
            doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(150, 150, 150);
            doc.text(`Transaction ID: ${data.paymentId}`, L, y);
        }

        // ── FOOTER ──
        for (let p = 1; p <= doc.internal.getNumberOfPages(); p++) {
            doc.setPage(p);
            doc.setDrawColor(230).line(L, H - 18, R, H - 18);
            doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(160, 160, 160);
            doc.text("Thank you for choosing Payal's Kitchen!", W / 2, H - 12, { align: 'center' });
        }

        doc.save(`${filename}.pdf`);
    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Failed to generate PDF.');
    }
};

// ── Helpers ──
function fmtDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Split selectedItems into individual dish names */
function expandSubs(sel) {
    if (!sel) return [];

    // Array of objects — each item separately
    if (Array.isArray(sel)) return sel.map(s => s.name || String(s));

    // Object — { name: "Dish1, Dish2, Dish3", planType: "Premium" }
    if (typeof sel === 'object') {
        const out = [];
        // Split comma-joined dish names into individual entries
        if (sel.name) {
            const dishes = sel.name.split(',').map(d => d.trim()).filter(Boolean);
            out.push(...dishes);
        }
        if (sel.planType) out.push(`Plan: ${sel.planType}`);
        if (sel.items && Array.isArray(sel.items)) {
            sel.items.forEach(s => out.push(s.name || String(s)));
        }
        return out;
    }
    return [String(sel)];
}
