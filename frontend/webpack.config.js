const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './sidebar.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'sidebar.html', to: 'sidebar.html' },
        { from: 'sidebar.css', to: 'sidebar.css' },
      ],
    }),
  ],
}; 