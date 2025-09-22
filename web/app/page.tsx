"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ゲームの主要なコンポーネント
const PingPongGame = () => {
  // Canvas要素への参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ゲームの状態管理
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');

  // 最新のゲーム状態を保持するための参照
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 最新のcanvasとcontextを保持するための参照
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // ゲームの定数
  const PADDLE_HEIGHT = 100;
  const PADDLE_WIDTH = 12;
  const BALL_RADIUS = 10;
  const INITIAL_BALL_SPEED = 5;
  const MAX_BALL_SPEED = 15;

  // ゲーム要素の位置や速度を保持するための参照
  const gameElements = useRef({
    ballX: 0,
    ballY: 0,
    ballSpeedX: 0,
    ballSpeedY: 0,
    playerY: 0,
    aiY: 0,
    // ボールの色を変更するための状態
    ballColor: '#f7fafc',
    // 画面フラッシュのための状態
    flashColor: 'rgba(0,0,0,0)',
    // 変化するボールとパドルのサイズ
    currentBallRadius: BALL_RADIUS,
    currentPlayerPaddleHeight: PADDLE_HEIGHT,
    currentAiPaddleHeight: PADDLE_HEIGHT,
  });

  // Canvasの初期化とリサイズ処理
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found.");
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      console.error("2D context not available.");
      return;
    }
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    contextRef.current = context; // context refを設定

    // ゲーム要素の初期位置を設定
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    gameElements.current.playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    gameElements.current.aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
  }, []);

  // ゲームをリセットする関数
  const resetGame = useCallback((canvas: HTMLCanvasElement) => {
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    gameElements.current.ballColor = '#f7fafc';
    gameElements.current.currentBallRadius = BALL_RADIUS;
    gameElements.current.currentPlayerPaddleHeight = PADDLE_HEIGHT;
    gameElements.current.currentAiPaddleHeight = PADDLE_HEIGHT;
    // ランダムな方向にボールを発射
    const side = Math.random() > 0.5 ? 1 : -1;
    gameElements.current.ballSpeedX = INITIAL_BALL_SPEED * side;
    gameElements.current.ballSpeedY = Math.random() * 6 - 3;
  }, []);

  // ランダムイベントのトリガー
  const triggerRandomEvent = () => {
    const { current: el } = gameElements;
    const event = Math.random();
    if (event < 0.3) { // ボールサイズの変更
      el.currentBallRadius = BALL_RADIUS * (0.5 + Math.random());
    } else if (event < 0.6) { // プレイヤーパドルの変更
      el.currentPlayerPaddleHeight = PADDLE_HEIGHT * (0.5 + Math.random());
    } else { // AIパドルの変更
      el.currentAiPaddleHeight = PADDLE_HEIGHT * (0.5 + Math.random());
    }
  };

  // ゲームロジックの更新
  const update = useCallback((canvas: HTMLCanvasElement) => {
    const { current: el } = gameElements;

    el.ballX += el.ballSpeedX;
    el.ballY += el.ballSpeedY;

    // AIパドルの移動ロジックをより賢く調整
    // ボールの進行方向を予測してパドルを動かす
    const aiCenter = el.aiY + el.currentAiPaddleHeight / 2;
    const aiPredictionY = el.ballY + el.ballSpeedY * 10;
    const aiTargetY = aiPredictionY;

    const aiSpeed = Math.abs(el.ballSpeedY) * 1.0;
    if (aiCenter < aiTargetY - 10) {
      el.aiY += aiSpeed;
    } else if (aiCenter > aiTargetY + 10) {
      el.aiY -= aiSpeed;
    }
    el.aiY = Math.max(0, Math.min(el.aiY, canvas.height - el.currentAiPaddleHeight));

    // 衝突判定: 上下の壁
    if (el.ballY - el.currentBallRadius < 0 || el.ballY + el.currentBallRadius > canvas.height) {
      el.ballSpeedY = -el.ballSpeedY;
    }

    // 衝突判定: パドル
    // プレイヤーパドル
    if (el.ballX - el.currentBallRadius < PADDLE_WIDTH &&
      el.ballY > el.playerY &&
      el.ballY < el.playerY + el.currentPlayerPaddleHeight) {
      const currentSpeed = Math.sqrt(el.ballSpeedX * el.ballSpeedX + el.ballSpeedY * el.ballSpeedY);
      if (currentSpeed < MAX_BALL_SPEED) {
        el.ballSpeedX *= 1.1;
        el.ballSpeedY *= 1.1;
      }
      el.ballSpeedX = -el.ballSpeedX;
      const deltaY = el.ballY - (el.playerY + el.currentPlayerPaddleHeight / 2);
      el.ballSpeedY = deltaY * 0.2;
      el.ballColor = '#66ccff';
      setTimeout(() => el.ballColor = '#f7fafc', 100);
    }

    // AIパドル
    if (el.ballX + el.currentBallRadius > canvas.width - PADDLE_WIDTH &&
      el.ballY > el.aiY &&
      el.ballY < el.aiY + el.currentAiPaddleHeight) {
      const currentSpeed = Math.sqrt(el.ballSpeedX * el.ballSpeedX + el.ballSpeedY * el.ballSpeedY);
      if (currentSpeed < MAX_BALL_SPEED) {
        el.ballSpeedX *= 1.1;
        el.ballSpeedY *= 1.1;
      }
      el.ballSpeedX = -el.ballSpeedX;
      const deltaY = el.ballY - (el.aiY + el.currentAiPaddleHeight / 2);
      el.ballSpeedY = deltaY * 0.2;
      el.ballColor = '#ff9999';
      setTimeout(() => el.ballColor = '#f7fafc', 100);
    }

    // 得点判定
    if (el.ballX < 0) {
      setScore(s => ({ ...s, ai: s.ai + 1 }));
      el.flashColor = 'rgba(245, 101, 101, 0.5)';
      setTimeout(() => el.flashColor = 'rgba(0,0,0,0)', 300);
      resetGame(canvas);
    } else if (el.ballX > canvas.width) {
      setScore(s => ({ ...s, player: s.player + 1 }));
      el.flashColor = 'rgba(66, 153, 225, 0.5)';
      setTimeout(() => el.flashColor = 'rgba(0,0,0,0)', 300);
      resetGame(canvas);
    }

    // ゲームオーバー判定
    if (scoreRef.current.player >= 5 || scoreRef.current.ai >= 5) {
      setGameState('gameOver');
    }
  }, [resetGame]);

  // 描画処理
  const draw = useCallback((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { current: el } = gameElements;

    // 背景
    context.fillStyle = '#1a202c';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 得点時のフラッシュ描画
    context.fillStyle = el.flashColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // センターライン
    context.strokeStyle = '#4a5568';
    context.lineWidth = 4;
    context.setLineDash([10, 10]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
    context.setLineDash([]);


    // プレイヤーパドル
    context.fillStyle = '#4299e1';
    context.fillRect(0, el.playerY, PADDLE_WIDTH, el.currentPlayerPaddleHeight);

    // AIパドル
    context.fillStyle = '#f56565';
    context.fillRect(canvas.width - PADDLE_WIDTH, el.aiY, PADDLE_WIDTH, el.currentAiPaddleHeight);

    // ボール
    context.fillStyle = el.ballColor;
    context.beginPath();
    context.arc(el.ballX, el.ballY, el.currentBallRadius, 0, Math.PI * 2);
    context.fill();

    // スコア表示
    context.font = '48px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#e2e8f0';
    context.fillText(scoreRef.current.player.toString(), canvas.width / 2 - 60, 50);
    context.fillText(scoreRef.current.ai.toString(), canvas.width / 2 + 60, 50);
  }, []);

  // ゲーム開始前/終了後の画面描画
  const drawStartOrGameOver = useCallback((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    context.fillStyle = 'rgba(26, 32, 44, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f7fafc';
    context.textAlign = 'center';

    if (gameStateRef.current === 'start') {
      context.font = '40px "Segoe UI", sans-serif';
      context.fillText('ピンポンゲーム', canvas.width / 2, canvas.height / 2 - 40);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックまたはタップして開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameStateRef.current === 'gameOver') {
      context.font = '40px "Segoe UI", sans-serif';
      const winner = score.player >= 5 ? 'プレイヤーの勝利！' : 'AIの勝利！';
      context.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 60);
      context.fillText(winner, canvas.width / 2, canvas.height / 2);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }, [score.player]);

  // イベントハンドラをuseCallbackでメモ化
  const handleResize = useCallback(() => {
    initializeCanvas();
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      drawStartOrGameOver(context, canvas);
    }
  }, [initializeCanvas, drawStartOrGameOver]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let newPlayerY = e.clientY - rect.top - gameElements.current.currentPlayerPaddleHeight / 2;
    newPlayerY = Math.max(0, Math.min(newPlayerY, canvas.height - gameElements.current.currentPlayerPaddleHeight));
    gameElements.current.playerY = newPlayerY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    let newPlayerY = touchY - rect.top - gameElements.current.currentPlayerPaddleHeight / 2;
    newPlayerY = Math.max(0, Math.min(newPlayerY, canvas.height - gameElements.current.currentPlayerPaddleHeight));
    gameElements.current.playerY = newPlayerY;
    e.preventDefault();
  }, []);

  // イベントリスナーはコンポーネントのマウント時に一度だけセットアップする
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleResize, handleMouseMove, handleTouchMove]);

  // ゲームループのセットアップ
  useEffect(() => {
    initializeCanvas();
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    let animationFrameId: number;
    const gameLoop = () => {
      update(canvas);
      draw(context, canvas);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      resetGame(canvas);
      animationFrameId = requestAnimationFrame(gameLoop);
      const eventInterval = setInterval(triggerRandomEvent, 10000); // 10秒ごとにイベントを発生
      return () => {
        cancelAnimationFrame(animationFrameId);
        clearInterval(eventInterval);
      };
    } else {
      drawStartOrGameOver(context, canvas);
    }
  }, [gameState, initializeCanvas, resetGame, update, draw, drawStartOrGameOver]);

  const handleCanvasClick = () => {
    if (gameState === 'start') {
      setScore({ player: 0, ai: 0 });
      setGameState('playing');
    } else if (gameState === 'gameOver') {
      setScore({ player: 0, ai: 0 });
      setGameState('start');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-4xl font-bold mb-4">AI対戦ピンポン</h1>
      <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-none"
          onClick={handleCanvasClick}
        />
      </div>
      <p className="mt-4 text-gray-400">
        マウスまたは指を動かしてパドルを操作します。
        <br />5点先取で勝利です。
      </p>
    </div>
  );
};

export default PingPongGame;
