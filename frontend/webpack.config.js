const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

module.exports = {
  entry: {
    sidebar: './js/sidebar.js',
    content: './js/content.js',
    popup: './js/popup.js',
    background: './js/background.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'html/sidebar.html',
          to: 'sidebar.html',
          transform(content) {
            return content
              .toString()
              .replace('../css/sidebar.css', 'sidebar.css')
              .replace('../js/sidebar.js', 'sidebar.js')
              .replace('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', 'fontawesome.css');
          },
        },
        {
          from: 'html/popup.html',
          to: 'popup.html',
          transform(content) {
            return content
              .toString()
              .replace('../css/popup.css', 'popup.css')
              .replace('../js/popup.js', 'popup.js')
              .replace('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', 'fontawesome.css');
          },
        },
        { from: 'css/sidebar.css', to: 'sidebar.css' },
        { from: 'css/popup.css', to: 'popup.css' },
        { from: 'css/styles.css', to: 'styles.css' },
        { from: 'css/fontawesome.css', to: 'fontawesome.css' },
        { from: 'assets', to: 'assets' },
        { 
          from: 'src/manifest.json', 
          to: 'manifest.json',
          transform(content) {
            // Use the manifest.json from src directory
            return content;
          },
        }
      ],
    }),
  ],
}; 