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
    flashColor: 'rgba(0,0,0,0)'
  });

  // Canvasの初期化とリサイズ処理
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found.");
      return { canvas: null, context: null };
    }
    const context = canvas.getContext('2d');
    if (!context) {
      console.error("2D context not available.");
      return { canvas, context: null };
    }
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // ゲーム要素の初期位置を設定
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    gameElements.current.playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    gameElements.current.aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;

    return { canvas, context };
  }, []);

  // ゲームをリセットする関数
  const resetGame = useCallback((canvas: HTMLCanvasElement) => {
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    gameElements.current.ballColor = '#f7fafc';
    // ランダムな方向にボールを発射
    let side = Math.random() > 0.5 ? 1 : -1;
    gameElements.current.ballSpeedX = INITIAL_BALL_SPEED * side;
    gameElements.current.ballSpeedY = Math.random() * 6 - 3;
  }, []);

  // ゲームのメインループ
  useEffect(() => {
    const { canvas, context } = initializeCanvas();
    if (!canvas || !context) return;

    let animationFrameId: number;
    let lastTime = 0;
    const gameLoop = (timestamp: number) => {
      // フレームレートの調整
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      if (gameState !== 'playing') {
        drawStartOrGameOver(context, canvas);
        return;
      }

      update(canvas);
      draw(context, canvas);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      resetGame(canvas);
      animationFrameId = requestAnimationFrame(gameLoop);
    } else {
      drawStartOrGameOver(context, canvas);
    }

    const handleResize = () => {
      initializeCanvas();
      if (gameState !== 'playing') {
        drawStartOrGameOver(context, canvas);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState, initializeCanvas, resetGame]);

  // プレイヤーのパドル操作
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      let newPlayerY = e.clientY - rect.top - PADDLE_HEIGHT / 2;
      newPlayerY = Math.max(0, Math.min(newPlayerY, canvas.height - PADDLE_HEIGHT));
      gameElements.current.playerY = newPlayerY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // ゲームロジックの更新
  const update = (canvas: HTMLCanvasElement) => {
    const { current: el } = gameElements;

    el.ballX += el.ballSpeedX;
    el.ballY += el.ballSpeedY;

    // AIパドルの移動ロジックをより賢く調整
    const aiCenter = el.aiY + PADDLE_HEIGHT / 2;
    const aiSpeed = Math.abs(el.ballSpeedY) * 0.9; // ボール速度に応じてAIの速度も調整
    if (aiCenter < el.ballY - 20) {
      el.aiY += aiSpeed;
    } else if (aiCenter > el.ballY + 20) {
      el.aiY -= aiSpeed;
    }
    el.aiY = Math.max(0, Math.min(el.aiY, canvas.height - PADDLE_HEIGHT));

    // 衝突判定: 上下の壁
    if (el.ballY - BALL_RADIUS < 0 || el.ballY + BALL_RADIUS > canvas.height) {
      el.ballSpeedY = -el.ballSpeedY;
    }

    // 衝突判定: パドル
    // プレイヤーパドル
    if (el.ballX - BALL_RADIUS < PADDLE_WIDTH &&
      el.ballY > el.playerY &&
      el.ballY < el.playerY + PADDLE_HEIGHT) {
      // ボールの速度を上げる
      const currentSpeed = Math.sqrt(el.ballSpeedX * el.ballSpeedX + el.ballSpeedY * el.ballSpeedY);
      if (currentSpeed < MAX_BALL_SPEED) {
        el.ballSpeedX *= 1.1;
        el.ballSpeedY *= 1.1;
      }
      el.ballSpeedX = -el.ballSpeedX;
      let deltaY = el.ballY - (el.playerY + PADDLE_HEIGHT / 2);
      el.ballSpeedY = deltaY * 0.2;
      el.ballColor = '#66ccff'; // ヒット時の色
      setTimeout(() => el.ballColor = '#f7fafc', 100);
    }

    // AIパドル
    if (el.ballX + BALL_RADIUS > canvas.width - PADDLE_WIDTH &&
      el.ballY > el.aiY &&
      el.ballY < el.aiY + PADDLE_HEIGHT) {
      // ボールの速度を上げる
      const currentSpeed = Math.sqrt(el.ballSpeedX * el.ballSpeedX + el.ballSpeedY * el.ballSpeedY);
      if (currentSpeed < MAX_BALL_SPEED) {
        el.ballSpeedX *= 1.1;
        el.ballSpeedY *= 1.1;
      }
      el.ballSpeedX = -el.ballSpeedX;
      let deltaY = el.ballY - (el.aiY + PADDLE_HEIGHT / 2);
      el.ballSpeedY = deltaY * 0.2;
      el.ballColor = '#ff9999'; // ヒット時の色
      setTimeout(() => el.ballColor = '#f7fafc', 100);
    }

    // 得点判定
    if (el.ballX < 0) {
      setScore(s => ({ ...s, ai: s.ai + 1 }));
      el.flashColor = 'rgba(245, 101, 101, 0.5)'; // AI得点時に赤くフラッシュ
      setTimeout(() => el.flashColor = 'rgba(0,0,0,0)', 300);
      resetGame(canvas);
    } else if (el.ballX > canvas.width) {
      setScore(s => ({ ...s, player: s.player + 1 }));
      el.flashColor = 'rgba(66, 153, 225, 0.5)'; // プレイヤー得点時に青くフラッシュ
      setTimeout(() => el.flashColor = 'rgba(0,0,0,0)', 300);
      resetGame(canvas);
    }

    // ゲームオーバー判定
    if (scoreRef.current.player >= 5 || scoreRef.current.ai >= 5) {
      setGameState('gameOver');
    }
  };

  // 描画処理
  const draw = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
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
    context.fillRect(0, el.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // AIパドル
    context.fillStyle = '#f56565';
    context.fillRect(canvas.width - PADDLE_WIDTH, el.aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // ボール
    context.fillStyle = el.ballColor;
    context.beginPath();
    context.arc(el.ballX, el.ballY, BALL_RADIUS, 0, Math.PI * 2);
    context.fill();

    // スコア表示
    context.font = '48px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#e2e8f0';
    context.fillText(scoreRef.current.player.toString(), canvas.width / 2 - 60, 50);
    context.fillText(scoreRef.current.ai.toString(), canvas.width / 2 + 60, 50);
  };

  // ゲーム開始前/終了後の画面描画
  const drawStartOrGameOver = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    context.fillStyle = 'rgba(26, 32, 44, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f7fafc';
    context.textAlign = 'center';

    if (gameState === 'start') {
      context.font = '40px "Segoe UI", sans-serif';
      context.fillText('ピンポンゲーム', canvas.width / 2, canvas.height / 2 - 40);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックして開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameOver') {
      context.font = '40px "Segoe UI", sans-serif';
      const winner = score.player >= 5 ? 'プレイヤーの勝利！' : 'AIの勝利！';
      context.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 60);
      context.fillText(winner, canvas.width / 2, canvas.height / 2);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックしてリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  };

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
      <p className="mt-4 text-gray-400">マウスを動かしてパドルを操作します。5点先取で勝利です。</p>
    </div>
  );
};

export default PingPongGame;
