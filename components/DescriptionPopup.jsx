import React from 'react'

export default function DescriptionPopup({descriptionPopup, setDescriptionPopup}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full relative">
      <button
        className="absolute top-2 right-3 text-gray-700 hover:text-gray-500 font-semibold text-lg cursor-pointer "
        onClick={() => setDescriptionPopup(null)}
      >
        ✕
      </button>
      <h3 className="text-xl font-semibold mb-2">{descriptionPopup.title}</h3>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">
        {descriptionPopup.description}
      </p>
    </div>
  </div>
  )
}
