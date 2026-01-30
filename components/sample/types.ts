type CardProps = {
  id: string;
  title: string;
};

type ColumnProps = {
  id: string;
  title: string;
  cards: CardProps[];
};