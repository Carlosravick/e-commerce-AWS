import os
import json
import boto3
import logging

# Configuração do logger para que os logs apareçam no CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializa o client do SQS usando o Boto3 (SDK da AWS para Python)
sqs = boto3.client('sqs')

# Função para montar os headers de CORS (Cross-Origin Resource Sharing)
def get_cors_headers():
    origin = os.environ.get('CORS_ORIGIN') 
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Content-Type": "application/json"
    } 

# Função principal da Lambda
def lambda_handler(event, _context):
    logging.info(f"Evento recebido: {event}")

    # Responde requisições de pré-vôo CORS (continua igual)
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": "CORS preflight" })
        }

    # Tenta fazer o parse do corpo da requisição (continua igual)
    try:
        body = json.loads(event["body"])
    except (KeyError, TypeError, json.JSONDecodeError) as e:
        logging.warning(f"Erro ao interpretar body: {str(e)}")
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": "Body inválido ou ausente" })
        }

    # --- MUDANÇAS PRINCIPAIS AQUI ---

    # Extrai dados do body, agora esperando 'payment_token'
    pedido_id = body.get("pedidoId")
    payment_token = body.get("payment_token") # MUDANÇA: Pegamos o token, não mais o número do cartão

    # Validação simples dos campos obrigatórios atualizada
    if not pedido_id or not payment_token:
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            # MUDANÇA: Mensagem de erro atualizada
            "body": json.dumps({ "message": "pedidoId e payment_token são obrigatórios" })
        }

    # Tenta enviar mensagem para a fila SQS
    try:
        # MUDANÇA: A mensagem enviada para a fila agora contém o payment_token
        sqs.send_message(
            QueueUrl=os.environ['SQS_URL'],
            MessageBody=json.dumps({
                "pedidoId": pedido_id,
                "payment_token": payment_token
            })
        )

        logging.info(f"Mensagem enviada para SQS com pedidoId: {pedido_id}")

        # Retorna sucesso para o front-end
        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": f"Pagamento enviado para processamento. Pedido {pedido_id}" })
        }

    except Exception as e:
        logging.error(f"Erro ao enviar mensagem para SQS: {str(e)}")

        # Retorna erro para o front-end
        return {
            "statusCode": 500,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": "Erro ao processar pagamento" })
        }