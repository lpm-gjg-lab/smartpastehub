import path from 'path';

export default {
  mode: 'production',
  entry: {
    background: './extension/background.ts',
    'content-script': './extension/content-script.ts',
    'popup/popup': './extension/popup/popup.tsx'
  },
  output: {
    path: path.resolve(process.cwd(), 'dist/extension'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
