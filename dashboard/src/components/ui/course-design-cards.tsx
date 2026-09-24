import React from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import './course-design-cards.css';

// Define the type for the card data
export interface CardData {
  id: number;
  colorClass: string;
  date: string;
  title: string;
  description: string;
  progressPercent: string;
  progressValue: string;
  imgSrc1?: string;
  imgAlt1?: string;
  imgSrc2?: string;
  imgAlt2?: string;
  countdownText: string;
}

// Define the props for the Card component
export interface CardProps {
  data: CardData;
}

export const Card: React.FC<CardProps> = ({ data }) => {
  const {
    colorClass,
    date,
    title,
    description,
    progressPercent,
    progressValue,
    imgSrc1,
    imgAlt1,
    imgSrc2,
    imgAlt2,
    countdownText,
  } = data;

  return (
    <div className={`course-card ${colorClass}`}>
      <div className="course-card-header">
        <div className="course-card-date">{date}</div>
        <button className="course-card-options-btn" type="button" aria-label="Options">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="course-card-body">
        <h3 className="course-card-title">{title}</h3>
        <p className="course-card-desc">{description}</p>
        <div className="course-progress">
          <div className="course-progress-labels">
            <span>Progress</span>
            <span className="course-progress-val">{progressValue}</span>
          </div>
          <div className="course-progress-bar-track">
            <div
              className="course-progress-bar-fill"
              style={{ width: progressPercent }}
            />
          </div>
        </div>
      </div>
      <div className="course-card-footer">
        <ul className="course-avatar-group">
          {imgSrc1 && (
            <li>
              <img src={imgSrc1} alt={imgAlt1 || 'user avatar'} />
            </li>
          )}
          {imgSrc2 && (
            <li>
              <img src={imgSrc2} alt={imgAlt2 || 'user avatar'} />
            </li>
          )}
          <li>
            <button type="button" className="btn-add" aria-label="Add user">
              <Plus size={14} />
            </button>
          </li>
        </ul>
        <span className="btn-countdown">{countdownText}</span>
      </div>
    </div>
  );
};

export default Card;
