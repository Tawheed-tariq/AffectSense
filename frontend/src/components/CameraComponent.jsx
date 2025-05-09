// --------------------------------------------------------
// AffectSense
// Copyright 2025 Tavaheed Tariq
// --------------------------------------------------------


import { forwardRef, useState, useImperativeHandle, useRef } from 'react';
import Webcam from 'react-webcam';

const CameraComponent = forwardRef(({ onCapture }, ref) => {
  const webcamRef = useRef(null);
  const [mirrored, setMirrored] = useState(true);

  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      return webcamRef.current?.getScreenshot();
    }
  }));

  return (
    <div className="relative">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={mirrored}
        screenshotFormat="image/jpeg"
        className="w-full h-auto rounded-md"
      />
      <button
        onClick={() => setMirrored(!mirrored)}
        className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      </button>
    </div>
  );
});

CameraComponent.displayName = 'CameraComponent';

export default CameraComponent;