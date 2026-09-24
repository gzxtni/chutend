import React from 'react';
import Card from '@/components/ui/course-design-cards';

export const CourseCardsDemo: React.FC = () => {
  const cardData = [
    {
      id: 1,
      colorClass: 'green',
      date: 'Feb 2, 2026',
      title: 'Device Fleet Optimization',
      description: 'Telemetry stream analysis & battery diagnostics',
      progressPercent: '90%',
      progressValue: '90%',
      imgSrc1: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      imgAlt1: 'Operator 1',
      imgSrc2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      imgAlt2: 'Operator 2',
      countdownText: '2 days left',
    },
    {
      id: 2,
      colorClass: 'orange',
      date: 'Feb 05, 2026',
      title: 'Radar Geofence Deployment',
      description: 'High-precision coordinate boundaries setup',
      progressPercent: '30%',
      progressValue: '30%',
      imgSrc1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      imgAlt1: 'Operator 3',
      imgSrc2: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
      imgAlt2: 'Operator 4',
      countdownText: '3 weeks left',
    },
    {
      id: 3,
      colorClass: 'red',
      date: 'March 03, 2026',
      title: 'Security Policy Compliance',
      description: 'Remote lock & zero-trust configuration audit',
      progressPercent: '50%',
      progressValue: '50%',
      imgSrc1: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces',
      imgAlt1: 'Operator 5',
      imgSrc2: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
      imgAlt2: 'Operator 6',
      countdownText: '3 weeks left',
    },
    {
      id: 4,
      colorClass: 'blue',
      date: 'March 08, 2026',
      title: 'Application Package Push',
      description: 'Silent rollout of field management v2.4 build',
      progressPercent: '20%',
      progressValue: '20%',
      imgSrc1: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
      imgAlt1: 'Operator 7',
      imgSrc2: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces',
      imgAlt2: 'Operator 8',
      countdownText: '3 weeks left',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', padding: '1rem 0' }}>
      {cardData.map((card) => (
        <Card key={card.id} data={card} />
      ))}
    </div>
  );
};

export default CourseCardsDemo;
