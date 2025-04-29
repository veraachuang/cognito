import React from 'react';
import { FileText, LayoutList, Upload, PenTool } from 'lucide-react';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <div className="p-6 rounded-xl bg-white bg-opacity-70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
      <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#c82e2e] bg-opacity-10 text-[#c82e2e]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Brain Dump",
      description: "Write freely about any topic without worrying about structure. Let your ideas flow naturally."
    },
    {
      icon: <LayoutList className="h-6 w-6" />,
      title: "Smart Outlines",
      description: "Automatically generate structured outlines from your unorganized thoughts and ideas."
    },
    {
      icon: <Upload className="h-6 w-6" />,
      title: "Document Upload",
      description: "Upload and analyze documents directly in your browser for instant insights and organization."
    },
    {
      icon: <PenTool className="h-6 w-6" />,
      title: "Writing Analysis",
      description: "Get detailed analysis of your writing style, readability, and suggestions for improvement."
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Cognito helps you capture, organize, and refine your ideas with powerful yet intuitive tools.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Feature
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;