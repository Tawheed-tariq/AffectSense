// --------------------------------------------------------
// AffectSense
// Copyright 2025 Tavaheed Tariq
// --------------------------------------------------------


import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function EmotionChart({ data }) {
  const chartData = {
    labels: Object.keys(data).filter(key => key !== 'timestamp' && key !== 'predicted_class' && key !== 'session_id' && key !== "confidence" && key !== "faces" && key !== "faces_found"),
    datasets: [
      {
        label: 'Emotion Probability',
        data: Object.keys(data)
          .filter(key => key !== 'timestamp' && key !== 'predicted_class')
          .map(key => data[key]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',   // Angry - Red
          'rgba(54, 162, 235, 0.6)',    // Disgust - Blue
          'rgba(255, 206, 86, 0.6)',    // Fear - Yellow
          'rgba(75, 192, 192, 0.6)',    // Happy - Teal
          'rgba(153, 102, 255, 0.6)',   // Sad - Purple
          'rgba(255, 159, 64, 0.6)',    // Surprise - Orange
          'rgba(199, 199, 199, 0.6)'     // Neutral - Gray
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Emotion Probabilities',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1
      }
    }
  };

  return <Bar data={chartData} options={options} />;
}