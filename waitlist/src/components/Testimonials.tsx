import React from 'react';
import { Star } from 'lucide-react';

interface TestimonialProps {
  quote: string;
  name: string;
  title: string;
  stars: number;
}

const Testimonial: React.FC<TestimonialProps> = ({ quote, name, title, stars }) => {
  return (
    <div className="bg-white bg-opacity-70 backdrop-blur-sm p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
      <div className="flex mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < stars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <blockquote className="text-gray-700 mb-4">{quote}</blockquote>
      <div className="font-semibold text-gray-900">{name}</div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
};

const Testimonials = () => {
  const testimonials = [
    {
      quote: "Cognito has completely transformed how I organize my thoughts. It's like having a second brain in my browser.",
      name: "Sarah Johnson",
      title: "Content Creator",
      stars: 5
    },
    {
      quote: "The writing analysis feature helps me improve my content quality with actionable insights. Can't wait for the full release!",
      name: "Michael Chen",
      title: "Marketing Director",
      stars: 5
    },
    {
      quote: "As someone who constantly juggles multiple writing projects, Cognito has been a game-changer for my workflow.",
      name: "Priya Patel",
      title: "Technical Writer",
      stars: 4
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What Early Users Say</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hear from our beta testers who have experienced the power of Cognito.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Testimonial
              key={index}
              quote={testimonial.quote}
              name={testimonial.name}
              title={testimonial.title}
              stars={testimonial.stars}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;