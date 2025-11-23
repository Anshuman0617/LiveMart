// client/src/components/Questions.jsx
import React, { useEffect, useState } from "react";
import { api, authHeader } from "../api";
import { useModal } from "../hooks/useModal";

export default function Questions({ productId, productOwnerId, allowQuestionForm = true }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true); // Q&A section expanded by default
  const [expandedQuestions, setExpandedQuestions] = useState({}); // Track which individual questions are expanded
  const { showModal, ModalComponent } = useModal();

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/questions/product/${productId}`, {
        headers: user ? authHeader() : {}
      });
      setQuestions(res.data || []);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [productId]);

  const submitQuestion = async () => {
    if (!user) {
      showModal("Please login to ask a question", "Login Required", "warning");
      return;
    }
    
    if (!questionText.trim()) {
      showModal("Please enter a question", "Question Required", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        "/questions",
        { productId, question: questionText },
        { headers: authHeader() }
      );
      setQuestionText("");
      loadQuestions();
      showModal("Question submitted successfully!", "Success", "success");
    } catch (err) {
      console.error("Failed to submit question:", err);
      showModal(err.response?.data?.error || "Failed to submit question", "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const answerQuestion = async (questionId, answer) => {
    if (!answer.trim()) {
      showModal("Please enter an answer", "Answer Required", "warning");
      return;
    }

    try {
      await api.put(
        `/questions/${questionId}/answer`,
        { answer },
        { headers: authHeader() }
      );
      loadQuestions();
      showModal("Answer submitted successfully!", "Success", "success");
    } catch (err) {
      console.error("Failed to submit answer:", err);
      showModal(err.response?.data?.error || "Failed to submit answer", "Error", "error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const isRetailer = user?.role === 'retailer' && user?.id === productOwnerId;

  return (
    <div style={{ marginTop: '40px' }}>
      <ModalComponent />
      {/* Section Header with Minimize Toggle */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ margin: 0 }}>Customer Questions & Answers</h3>
        <button
          style={{
            color: '#2a7ba0',
            padding: '4px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '− Minimize' : '+ Expand'}
        </button>
      </div>

      {expanded && (
        <>

      {/* Ask Question Form - Only for regular users */}
      {allowQuestionForm && !isRetailer && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '16px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          {user ? (
            <>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
                Ask a question about this product
              </p>
              <textarea
                placeholder="Type your question here..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                style={{ 
                  width: "100%", 
                  minHeight: 80, 
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <button 
                onClick={submitQuestion}
                disabled={submitting || !questionText.trim()}
                style={{ 
                  marginTop: '12px',
                  padding: '10px 20px',
                  backgroundColor: submitting || !questionText.trim() ? '#9ca3af' : '#3399cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting || !questionText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Question'}
              </button>
            </>
          ) : (
            <p style={{ margin: 0, opacity: 0.7 }}>Please login to ask a question</p>
          )}
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <p>Loading questions...</p>
      ) : questions.length === 0 ? (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No questions yet. Be the first to ask!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q) => {
            const isQuestionExpanded = expandedQuestions[q.id] !== false; // Default to expanded
            return (
              <div
                key={q.id}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "#fff"
                }}
              >
                {/* Question Header - Clickable to minimize */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: isQuestionExpanded ? '8px' : '0',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedQuestions({ ...expandedQuestions, [q.id]: !isQuestionExpanded })}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>{q.user?.name || "User"}</strong>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        asked on {formatDate(q.createdAt)}
                      </span>
                      {q.user?.id === user?.id && (
                        <span style={{ fontSize: '11px', color: '#3399cc', fontWeight: 600 }}>
                          (Your question)
                        </span>
                      )}
                    </div>
                    {isQuestionExpanded && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#374151' }}>{q.question}</p>
                    )}
                  </div>
                  <button
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '12px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedQuestions({ ...expandedQuestions, [q.id]: !isQuestionExpanded });
                    }}
                  >
                    {isQuestionExpanded ? '−' : '+'}
                  </button>
                </div>

                {/* Answer - Only show when expanded */}
                {isQuestionExpanded && (
                  <>
                    {q.answer ? (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '12px', 
                        backgroundColor: '#f0fdf4', 
                        borderRadius: '6px',
                        borderLeft: '3px solid #10b981'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#166534' }}>
                              {q.answeredByUser?.name || "Retailer"}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              answered on {formatDate(q.answeredAt)}
                            </span>
                          </div>
                          {isRetailer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Trigger edit mode
                                setExpandedQuestions({ ...expandedQuestions, [`edit_${q.id}`]: true });
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #3b82f6',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: '#1e40af',
                                fontWeight: 600
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {expandedQuestions[`edit_${q.id}`] ? (
                          <EditAnswerForm 
                            questionId={q.id} 
                            currentAnswer={q.answer}
                            onSave={(newAnswer) => {
                              answerQuestion(q.id, newAnswer);
                              setExpandedQuestions({ ...expandedQuestions, [`edit_${q.id}`]: false });
                            }}
                            onCancel={() => {
                              setExpandedQuestions({ ...expandedQuestions, [`edit_${q.id}`]: false });
                            }}
                          />
                        ) : (
                          <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{q.answer}</p>
                        )}
                      </div>
                    ) : isRetailer ? (
                      <AnswerForm questionId={q.id} onAnswer={answerQuestion} />
                    ) : (
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                        No answer yet
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}

// Answer Form Component (for retailers)
function AnswerForm({ questionId, onAnswer }) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showModal, ModalComponent } = useModal();

  const handleSubmit = async () => {
    setSubmitting(true);
    await onAnswer(questionId, answer);
    setAnswer("");
    setSubmitting(false);
  };

  return (
    <div style={{ 
      marginTop: '12px', 
      padding: '12px', 
      backgroundColor: '#eff6ff', 
      borderRadius: '6px',
      border: '1px solid #bfdbfe'
    }}>
      <ModalComponent />
      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
        Answer this question:
      </p>
      <textarea
        placeholder="Type your answer here..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        style={{ 
          width: "100%", 
          minHeight: 60, 
          padding: '8px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontFamily: 'inherit',
          resize: 'vertical'
        }}
      />
      <button 
        onClick={handleSubmit}
        disabled={submitting || !answer.trim()}
        style={{ 
          marginTop: '8px',
          padding: '8px 16px',
          backgroundColor: submitting || !answer.trim() ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );
}

// Edit Answer Form Component (for retailers)
function EditAnswerForm({ questionId, currentAnswer, onSave, onCancel }) {
  const [answer, setAnswer] = useState(currentAnswer);
  const [submitting, setSubmitting] = useState(false);
  const { showModal, ModalComponent } = useModal();

  const handleSave = async () => {
    if (!answer.trim()) {
      showModal("Please enter an answer", "Answer Required", "warning");
      return;
    }
    setSubmitting(true);
    await onSave(answer);
    setSubmitting(false);
  };

  return (
    <div>
      <ModalComponent />
      <textarea
        placeholder="Type your answer here..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        style={{ 
          width: "100%", 
          minHeight: 60, 
          padding: '8px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '8px'
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={handleSave}
          disabled={submitting || !answer.trim()}
          style={{ 
            padding: '6px 12px',
            backgroundColor: submitting || !answer.trim() ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button 
          onClick={onCancel}
          disabled={submitting}
          style={{ 
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

