const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const ImageminPlugin = require('image-minimizer-webpack-plugin');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
const isProd = !isDev;

const filename = (ext) => isDev ? `[name].${ext}` : `[name].[contenthash].${ext}`;

const optimization = () => {
  const configObj = {
    splitChunks: {
      chunks: 'all'
    }
  };

  if (isProd) {
    configObj.minimizer = [
      new CssMinimizerPlugin(),
      new TerserWebpackPlugin()
    ];
  }

  return configObj;
};

const generateHtmlPlugins = (templateDir) => {
  const templateFiles = fs.readdirSync(path.resolve(__dirname, templateDir));
  return templateFiles.map(item => {
    const parts = item.split('.');
    const name = parts[0];
    const extension = parts[1];
    return new HTMLWebpackPlugin({
      filename: `${name}.html`,
      template: path.resolve(__dirname, `${templateDir}/${name}.${extension}`),
      minify: {
        collapseWhitespace: isProd
      }
    })
  })
}

const plugins = () => {
  const basePlugins = [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: `./css/${filename('css')}`
    }),
    new CopyWebpackPlugin({
      patterns: [
        {from: path.resolve(__dirname, 'src/assets') , to: path.resolve(__dirname, 'app')}
      ]
    }),
  ].concat(generateHtmlPlugins(path.resolve(__dirname, 'src/pages')));

  if (isProd) {
    basePlugins.push(
      new ImageminPlugin({    
        minimizerOptions: {
          bail: false, // Ignore errors on corrupted images
          cache: true,
          plugins: [
            ["gifsicle", { interlaced: true }],
            ["jpegtran", { progressive: true }],
            ["optipng", { optimizationLevel: 5 }],
            [
              "svgo",
              {
                plugins: [
                  {
                    removeViewBox: false
                  }
                ]
              }
            ]
          ]
        }
      })
    )
  }

  return basePlugins;
};

module.exports = {
  context: path.resolve(__dirname, 'src'),
  mode: 'development',
  entry: ['./js/main.js', './scss/main.scss'],
  output: {
    filename: `./js/${filename('js')}`,
    path: path.resolve(__dirname, 'app'),
    publicPath: ''
  },
  devServer: {
    historyApiFallback: true,
    contentBase: path.resolve(__dirname, 'app'),
    open: true,
    compress: true,
    hot: true,
    port: 3000,
  },
  optimization: optimization(),
  plugins: plugins(),
  devtool: isProd ? false : 'source-map',
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: isDev
            },
          },
          'css-loader'
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: (resourcePath, context) => {
                return path.relative(path.dirname(resourcePath), context) + '/';
              },
            }
          },
          'css-loader',
          'sass-loader'
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.(?:|gif|png|jpg|jpeg|svg)$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: `./img/${filename('[ext]')}`
          }
        }],
      },
      {
        test: /\.(?:|woff2)$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: `./fonts/${filename('[ext]')}`
          }
        }],
      }
    ]
  }
};
