
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import dynamic from 'next/dynamic';

const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
});
type JobData = { date: string; total: number };

interface GraphProps {
  successData: JobData[];
  failedData: JobData[];
}

const Graph: React.FC<GraphProps> = ({ successData, failedData }) => {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  // Ensure successData and failedData are arrays before mapping over them  
  const labels = Array.isArray(successData) ? successData.map(entry => entry.date) : [];
  const successTotals = Array.isArray(successData) ? successData.map(entry => entry.total) : [];
  const failedTotals = Array.isArray(failedData) ? failedData.map(entry => entry.total) : [];

  const data = {
    labels,
    datasets: [
      {
        label: 'Successful Jobs',
        data: successTotals,
        borderColor: '#008ED3',
        backgroundColor: '#008ED3',
      },
      {
        label: 'Failed Jobs',
        data: failedTotals,
        borderColor: '#FF0000',
        backgroundColor: '#FF0000',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          display: true,
          color: '#A4EDFF',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
  //   <div className="mt-6 w-full p-4 md:p-8 rounded-3xl bg-white">
  //   <div className="flex flex-col items-start justify-between mb-6 gap-4 md:flex-row md:gap-8">
  //     <h3 className="text-lg md:text-xl font-medium font-sharp-grotesk text-career-black-200">
  //       Applications Comparisons
  //     </h3>
  //     <div className="w-full">
  //       <Line data={data} options={options} className="w-full h-full" />
  //     </div>
  //   </div>
  // </div>


  <div className="mt-6 w-full p-4 md:p-8 rounded-3xl bg-white">
  <div className="flex flex-col items-start justify-between mb-6 gap-4 md:gap-8 w-full">
     <h2 className="text-xl font-bold mb-4">
      Applications Comparisons
    </h2>
    <div className="w-full">
      <div className="relative h-64 md:h-96">
        <LineChart
          data={data}
          options={{
            ...options,
            maintainAspectRatio: false,
            responsive: true,
          }}
        />
      </div>
    </div>
  </div>
</div>



    );
  };

  export default Graph;









