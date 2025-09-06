import React from 'react';
import { PageHeader } from '../molecules/PageHeader';
import {
  AnalyticsItemCard,
  AnalyticsSimpleCard,
  AnalyticsPaymentCard,
} from '../molecules/AnalyticsCard';
import { InventoryItem } from '../../types/models';

interface AnalyticsCard {
  type: 'simple';
  title: string;
  value: string;
  className?: string;
  testId?: string;
}

interface AnalyticsItemCardData {
  type: 'item';
  title: string;
  item?: InventoryItem;
  emptyMessage?: string;
  testId?: string;
  valueDisplay?: 'price' | 'category';
}

interface AnalyticsPaymentCardData {
  type: 'payment';
  title: string;
  count: number;
  amount: number;
  testId?: string;
}

type AnalyticsCardData = AnalyticsCard | AnalyticsItemCardData | AnalyticsPaymentCardData;

interface AnalyticsPageTemplateProps {
  headerActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    title?: string;
    testId?: string;
  }>;

  cards: AnalyticsCardData[];
  customContent?: React.ReactNode;
}

export function AnalyticsPageTemplate({
  headerActions = [],
  cards,
  customContent,
}: AnalyticsPageTemplateProps) {
  const renderCard = (card: AnalyticsCardData, index: number) => {
    switch (card.type) {
      case 'simple':
        return (
          <AnalyticsSimpleCard
            key={index}
            title={card.title}
            value={card.value}
            className={card.className}
            testId={card.testId}
          />
        );
      case 'item':
        return (
          <AnalyticsItemCard
            key={index}
            title={card.title}
            item={card.item}
            emptyMessage={card.emptyMessage}
            testId={card.testId}
            valueDisplay={card.valueDisplay}
          />
        );
      case 'payment':
        return (
          <AnalyticsPaymentCard
            key={index}
            title={card.title}
            count={card.count}
            amount={card.amount}
            testId={card.testId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="page">
      <PageHeader title="Analytics Dashboard" actions={headerActions} />

      <div className="cards three-cols">{cards.map(renderCard)}</div>

      {customContent && <div className="custom-analytics-content">{customContent}</div>}
    </div>
  );
}
