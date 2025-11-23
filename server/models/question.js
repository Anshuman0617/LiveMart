// server/models/question.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // User who asked the question
    question: { type: DataTypes.TEXT, allowNull: false },
    isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false }, // Whether the question is asked anonymously
    answer: { type: DataTypes.TEXT, allowNull: true }, // Answer from retailer
    answeredAt: { type: DataTypes.DATE, allowNull: true }, // When retailer answered
    answeredBy: { type: DataTypes.INTEGER, allowNull: true } // Retailer who answered
  }, {
    tableName: 'questions',
    timestamps: true
  });

  return Question;
};

